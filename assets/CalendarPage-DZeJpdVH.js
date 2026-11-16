function i(){const n=window.location.hash.indexOf("?"),o=n>=0?window.location.hash.slice(n+1):"";return window.location.hash=`#/events${o?`?${o}`:""}`,null}export{i as CalendarPage};
