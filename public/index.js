const LOCAL_STORAGE = chrome.storage.local;
const RUNTIME       = chrome.runtime;

const BUTTON = document.querySelector(".PracticumInsider__toggler");
const DarkThemeText = {
  enabled: "🌙",
  disabled: "🌞"
};
const Prop = "DarkTheme";

const SyncButtonText = () => {
  LOCAL_STORAGE.get(Prop, (localStorage) => BUTTON.innerHTML = localStorage[Prop] ? DarkThemeText.enabled : DarkThemeText.disabled)
}

window.onload = () => SyncButtonText();

const SyncByData = (data) => {
  RUNTIME.sendMessage(data.COMMAND.SwitchTheme, (reply) => {
    reply.feedback === data.CODE_STATUS.Success ? SyncButtonText() : false
  })
}

const SwitchTheme = () => {
  new Promise((resolve, reject) => {
    RUNTIME.sendMessage(null, (PracticumInsider) =>
      PracticumInsider.CODE_STATUS.Complete ? resolve(PracticumInsider) : reject()
  )}).then((data) => SyncByData(data))
}

BUTTON.onclick = () => SwitchTheme();