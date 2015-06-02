Automatically group tabs in Firefox Panorama by URL or page title matching regular expression pattern or containing specific text. 
You can specify multiple 'filters' (rules of tab-filtering) to each group.

Each filter has following parameters:

 - Match type (text or regular expression) — determines if expression is plain text or regular expression pattern.
 - Search in (URL or title) — search for expression-matches in page's URL or in it's title text.
 - If page's title text is changing dynamically via JavaScript, only initial (appearing on page load) title will be checked!
 - Expression — expression (plain text or regular expression, depending on Match type) to search either in page URL or title text (depending on Search in value).

If tab matches filters for several groups, it will be placed to the first matching group.
You can manually sort groups in order of their priority (first group's filters will be checked first) via AutoGroup settings dialog.

If you want some tabs always to be loaded in current active group, there's a "Do not group" filter list for that.
Tabs matching do-not-group filters will not be moved from current group even if they match other group's filters.

By default, tab that doesn't match any of group filters will be opened in current active group.
If you want to explicitly define default group for tabs that don't match any other groups, create group, place it last in the group list and add group filter with following data:

 - Match type: regular expression
 - Search in: any
 - Expression: .* 

