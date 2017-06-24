addEventListener("DOMContentLoaded", function(e) {
    sendSyncMessage("autogroup-tab-load", {
        title: content.document.title,
        url: content.location.href,
    });
});
