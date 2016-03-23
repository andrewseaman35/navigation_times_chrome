$(document).ready(function() {
    init();
});

var SECONDS_PER_DAY = 86400;
var SECONDS_PER_HOUR = 3600;
var SECONDS_PER_MINUTE = 60;

var ERROR_NOT_SUPPORTED = 'html5 not supported';
var SUCCESS = 'success';
var LATITUDE = 'latitude';
var LONGITUDE = 'longitude';
var ROW_HEIGHT = 57;
var MAX_ROWS = 9;

var userPosition = {};
var userLatLng = null;
var apiLoaded = false;
var MY_LOCATION = 'my location';

var FAVORITES = {
    "Home": "199 Catalina Avenue, Pacifica, CA 94044",
    "Work": "50 Rio Robles, San Jose, CA"
    }

function init() {
    initializeUI();
}

function validateInput() {
    /* Valides input from UI and displays any errors if necessar
     *
     * Returns:
     *   bool, True if valud, False otherwise
     */

    // Check to see if there are any empty inputs
    var rows = document.getElementById("input_table").rows;
    for (var i = 1; i < rows.length; i++) {
        if (rows[i].cells[0].children[0].value.length < 1) {
            showError("Empty input cells are not valid")
            return false;
        }
    }

    // If we don't have the user's location, ensure that they are not 
    // requesting to user their location. If they are, get the location
    // and submit again.
    if (!userLatLng) {
        for (var i = 1; i < rows.length; i++) {
            val = rows[i].cells[0].children[0].value;
            if (val.toLowerCase() == MY_LOCATION) {
                getUserLocation(true)
                return false;
            }
        }
    }

    // If we got to here, the input must be valid!
    return true;
}

function getDirections() {
    /* Gathers all inputted information from the UI and validates. 
     * Parses into directions request and submits to directions service.
     */

    if (!validateInput()) {
        return;
    }

    // Create directions service
    dir_service = new google.maps.DirectionsService;

    table = document.getElementById("input_table");
    waypoints = [];

    // Go through all waypoint rows in the table to extract values
    for (var i = 2; i < table.rows.length - 1; i++) {
        val = table.rows[i].cells[0].children[0].value;
        // If user location is requested, add it as a waypoint
        if (val.toLowerCase() == MY_LOCATION) {
            waypoints.push({
                location: userLatLng
            })
            // Otherwise, push the input
        } else {
            waypoints.push({
                location: table.rows[i].cells[0].children[0].value
            })
        }
    }

    // User the user's location as the source if requested
    source = $("#src").val();
    if (source.toLowerCase() == MY_LOCATION) {
        source = userLatLng;
    }

    // Use the user's location as the destination if requested
    destination = $("#dest").val();
    if (destination.toLowerCase() == MY_LOCATION) {
        destination = userLatLng;
    }

    driving_options = {};

    // Put together the directions request 
    dir_request = {
        destination: destination,
        optimizeWaypoints: false,
        origin: source,
        travelMode: google.maps.TravelMode.DRIVING,
        waypoints: waypoints
    };

    dir_service.route(dir_request, function(dir_result, dir_status) {
        console.log("Query Return: " + dir_status)
        result = dir_result;

        if (dir_status == google.maps.DirectionsStatus.OK) {
            // There will only be one route result, no alternatives have 
            // been requested
            route_legs = result['routes'][0]['legs']

            route_duration = 0
            rows = document.getElementById('input_table').rows

            // Fill the table with the returned durations
            // Sum the durations to find the total duration
            for (var i = 0; i < route_legs.length; i++) {
                route_duration += route_legs[i]['duration']['value']
                rows[i + 2].cells[1].innerHTML = route_legs[i]['duration']['text']
            }

            $("#total_duration").html('<b>Total: </b>' + secondsToTime(route_duration));
            showInfo("");
        } else {
            handleDirectionResultError(dir_status);
        }
    });

    showInfo("Request sent")
}

function handleDirectionResultError(error) {
    /* Displays any error returned in the DirectionsResult to the user.
     */
    if (error == google.maps.DirectionsStatus.INVALID_REQUEST) {
        showError("Invalid request");
    } else if (error == google.maps.DirectionsStatus.NOT_FOUND) {
        showError("Origin, destination, or waypoint not found");
    } else if (error == google.maps.DirectionsStatus.OVER_QUERY_LIMIT) {
        showError("Over query limit");
    } else if (error == google.maps.DirectionsStatus.REQUEST_DENIED) {
        showError("Request has been denied");
    } else if (error == google.maps.DirectionsStatus.ZERO_RESULTS) {
        showError("No routes found");
    } else {
        showError("An unknown error occured");
    }
}

function showError(error) {
    /* Shows a string with #info_text, colored red.
     */
    $("#info_text").html(error);
    $("#info_text").css("color", "red");
}

function showInfo(info) {
    /* Shows a string with #info_text, colored black.
     */
    $("#info_text").html(info);
    $("#info_text").css("color", "black");
}

function secondsToTime(seconds) {
    /* Converts a number of seconds to an hour and date string. The
     * returned leg duration is in seconds.
     */
    days = Math.floor(seconds / SECONDS_PER_DAY);
    seconds = seconds % SECONDS_PER_DAY;
    hours = Math.floor(seconds / SECONDS_PER_HOUR);
    seconds = seconds % SECONDS_PER_HOUR;
    mins = Math.floor(seconds / SECONDS_PER_MINUTE);

    timeString = ""

    if (days > 0) {
        timeString += days;
        timeString += (days > 1) ? " days, " : " day, ";
    }
    if (days > 0 || hours > 0) {
        timeString += hours;
        timeString += (hours == 1) ? " hour, " : " hours, ";
    }
    return timeString + mins + " minutes"
}

function apiCallback() {
    apiLoaded = true;
}

function initializeUI() {
    /* Sets up the UI elements as necessary.
     */
    $("#submit_button").click(function() {
        getDirections();
    });

    $("#add_row_button").click(function() {
        addTableRow();
    });

    $("#location_button").click(function() {
        getUserLocation(false);
    });

    $("#settings_button").click(function() {
        displaySettings();
    });
}

function displaySettings() {
    /* Displays the settings version of the popup to the user. 
     * Javascript pertaining to settings is contained in js/settings.js.
     * This function only goes from query to settings views.
     */
    $("#submit_button").click(function() {
        saveSettings();
    });

    $("#settings_button").html("<i class='material-icons'>directions</i>")
    $("#settings_button").click(function() {
        displayWaypoints();
    });

    $("#total_duration").css("visibility", "invisible");

    table = document.getElementById("input_table");

    // Get rid of all the rows on the table
    num_rows = table.rows.length
    for (var i = 0; i < num_rows; i++) {
        table.deleteRow(-1);
        if (i < num_rows - 1){
            htmlHeight = $("html").height()
            $("html").height(htmlHeight - ROW_HEIGHT)
        }
    }

    // Make a new header row
    header_row = document.createElement("tr");
    place_head = document.createElement("th");
    loc_head = document.createElement("th");

    place_head.className = "col_left";
    place_head.innerHTML = "Place";
    loc_head.innerHTML = "Location";
    loc_head.className = "col_left";
    header_row.appendChild(place_head);
    header_row.appendChild(loc_head);
    table.appendChild(header_row);

    // Add all of the current favorite places
    for (var key in FAVORITES) {
        new_row = document.createElement("tr");
        place_td = document.createElement("td");
        loc_td = document.createElement("td");

        place_in = document.createElement("input");
        loc_in = document.createElement("input");
        place_in.className = "table_input";
        loc_in.className = "table_input";
        place_in.value = key;
        loc_in.value = FAVORITES[key]

        place_td.appendChild(place_in);
        loc_td.appendChild(loc_in);

        new_row.appendChild(place_td);
        new_row.appendChild(loc_td);

        table.appendChild(new_row);

        // Grow the table popup window as necessary
        htmlHeight = $("html").height()
        $("html").height(htmlHeight + ROW_HEIGHT)
    }
}

function displayWaypoints() {
    /* Displays the waypoints version of the popup to the user. 
     * Javascript pertaining to settings is contained in js/settings.js.
     * This function only goes from settings to waypoints views.
     */
    $("#submit_button").click(function() {
        getDirections();
    });

    $("#settings_button").html("<i class='material-icons'>settings</i>");
    $("#settings_button").click(function() {
        displaySettings();
    });

    $("#total_duration").css("visibility", "visible");
}

function saveSettings() {
    /*
     *
     */
    rows = document.getElementById("input_table").rows;
    num_rows = rows.length
    for (var i = 1; i < num_rows; i++) {
        place = rows[i].children[0].value;
        loc = rows[i].children[1].value;
        if (place.length > 0 && loc.length > 0) {
            FAVORITES[place] = loc;
        }
    }
}

function addTableRow() {
    /* Adds a row to the input table that represents a waypoint.
     * Calls a function that sets up the remove waypoint button as well
     * as enables/disables the add row button as necessary.
     */

    var table = document.getElementById("input_table");
    var newRow = document.createElement("tr");
    var lCell = newRow.insertCell(0);
    var mCell = newRow.insertCell(1);
    var rCell = newRow.insertCell(2);
    lCell.className = "col_left";

    lCell.innerHTML = '<input type=text id="src" class="table_input"></input>'
    var remove_button = document.createElement("button");
    remove_button.className = 'mdl-button mdl-js-button mdl-button--icon mdl-button--colored'
    remove_button.innerHTML = '<i class="material-icons">cancel</i>'
    rCell.appendChild(remove_button)

    destRow = table.rows[table.rows.length - 1]
    table.deleteRow(table.rows.length - 1)
    table.appendChild(newRow);
    table.appendChild(destRow);

    var htmlHeight = $("html").height()
    $("html").height(htmlHeight + ROW_HEIGHT)

    setupDeleteButtons()
}

function setupDeleteButtons() {
    /* Sets up the delete buttons for each of the additional desination
     * rows. Also disables add row button if we are maxed out on the 
     * amount of rows.
     */
    var table = document.getElementById("input_table");
    var rows = table.rows;

    // If there are at least 8 rows, disable the add row button
    $("#add_row_button").prop("disabled", rows.length >= MAX_ROWS)

    // Go through all waypoints and set up remove row button
    for (var i = 2; i < rows.length - 1; i++) {
        var cell = rows[i].cells[2];

        // Set the on click function for the button
        cell.children[0].onclick = (function() {
            var row = i;
            return function() {
                // Delete the table row
                var table = document.getElementById("input_table")
                table.deleteRow(row);

                // Shrink the popup window
                var htmlHeight = $("html").height()
                $("html").height(htmlHeight - ROW_HEIGHT)
                setupDeleteButtons()
            }
        })();
    }
}

function getUserLocation(submitAfter) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
                userPosition[LATITUDE] = position.coords.latitude;
                userPosition[LONGITUDE] = position.coords.longitude;
                userLatLng = new google.maps.LatLng(
                    position.coords.latitude,
                    position.coords.longitude
                )
                showInfo("Location found")
                $("#src").val("My Location");
                if (submitAfter) {
                    getDirections()
                }
            },
            getLocationError);
    } else {
        getLocationError(ERROR_NOT_SUPPORTED);
    }
}

function getLocationError(error) {
    userPosition[SUCCESS] = false;
    if (error == ERROR_NOT_SUPPORTED) {
        showError("Geolocation not supported");
        console.log("HTML5 Geolocation not supported");
        return;
    }

    switch (error.code) {
        case error.PERMISSION_DENIED:
            showError("Location permission required")
            console.log("User denied request");
            break;
        case error.POSITION_UNAVAILABLE:
            showError("Position unavailable")
            console.log("Location information unavailable");
            break;
        case error.TIMEOUT:
            showError("Location request has timed out")
            console.log("Request has timed out");
            break;
        case error.UNKNOWN_ERROR:
            showError("Error finding location information")
            console.log("Unknown error");
            break;
    }
}
