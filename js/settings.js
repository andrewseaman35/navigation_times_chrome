function displaySettings() {
    var val = "pooptest";

    chrome.storage.sync.set({'testval': val}, function() {
        console.log('saved!');
    });
}

