const LOCAL_STORAGE = chrome.storage.local;
const RUNTIME       = chrome.runtime;

const BUTTON = document.querySelector(".PracticumInsider__toggler");
const DarkThemeText = {
  enabled: "🌙",
  disabled: "🌞"
}

const SyncButtonTextIf = (condition) => {
  BUTTON.innerHTML = condition ? DarkThemeText.enabled : DarkThemeText.disabled;
}

const SwitchTheme = () => {
  new Promise((resolve, reject) => {
    RUNTIME.sendMessage(null, (PracticumInsider) => resolve(PracticumInsider))
  }).then((PracticumInsider) => {
    RUNTIME.sendMessage(PracticumInsider.COMMAND.SwitchTheme);

    const Prop = "DarkTheme";
    LOCAL_STORAGE.get(Prop, (localStorage) => SyncButtonTextIf(!localStorage[Prop]))
  })
}

window.onload = () => {
  const Prop = "DarkTheme";
  LOCAL_STORAGE.get(Prop, (localStorage) => SyncButtonTextIf(localStorage[Prop]))
};

BUTTON.onclick = () => {
  SwitchTheme();
}