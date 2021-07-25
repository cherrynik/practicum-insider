// FIXME: Sometimes theme doesn't switch
//        When windows deattached (more than one active window)
//        Or tab switched
//        Switcher can also freeze its state
//        Or apply state for other tabs and for itself only after switching between tabs
class PracticumInsider {
  #LOCAL_STORAGE = chrome.storage.local;
  #RUNTIME       = chrome.runtime;
  #TABS          = chrome.tabs;
  #SCRIPTING     = chrome.scripting;

  #PROP = {
    Theme: "DarkTheme"
  }

  #STATE = {
    DISABLED: false || 0,
    ENABLED: true || 1
  }

  #CODE_STATUS = {
    Failed: -1,
    Success: 0
  }

  #DarkTheme = {
    Inject: (tabId, css) => {
      return new Promise((resolve, reject) => {
        this.#SCRIPTING.insertCSS({
          target: { tabId: tabId },
          files: [css]
        }, () => this.#RUNTIME.lastError ? reject() : resolve());
      }).then((resolve) => this.#TabsPerSession[tabId] = this.#STATE.ENABLED,
              (reject) => this.#DarkTheme.Inject(tabId, css))
    },

    Eject: (tabId, css) => {
      return new Promise((resolve, reject) => {
        // FIXME: Remove so many attempts for success function calling
        delete this.#TabsPerSession[tabId]
        for (let i = 0; i < 10; ++i) {
          return this.#SCRIPTING.removeCSS({
            target: { tabId: tabId },
            files: [css]
          }, () => this.#RUNTIME.lastError ? reject() : resolve())
        }
      }).then((resolve) => {},
              (reject) => {})
    },

    State: this.#STATE.DISABLED
  }

  #NewPage = (name) => {
    name = name.toLowerCase();
    return {
      url: new RegExp(`^https://(.*\.?)pra(c|k)ti(c|k)um.yandex.(com|ru)\/${name}`),
      css: `./styles/${name}/${name}.css`
    };
  }

  #PAGE = {
    profile: this.#NewPage("profile"),
    learn:   this.#NewPage("learn"),
    trainer: this.#NewPage("trainer")
  }

  #COMMAND = {
    SwitchTheme: 1,
  }

  #TabsPerSession = {};
  #IsFirstLoadingIteration = true;

  #GetPageName = (url) => {
    return Object.keys(this.#PAGE).find((key) => this.#PAGE[key].url.test(url));
  }

  #LoadTab = () => {
    this.#TABS.query({
      active: true,
      currentWindow: true,
      url: [
        "https://*.praktikum.yandex.ru/*",
        "https://*.practicum.yandex.com/*"]}, (activeTabInArray) => {
        if (this.#RUNTIME.lastError || !activeTabInArray) {
          setTimeout(() => this.#LoadTab(), 10);
          return false;
        } else if (activeTabInArray.length) {
          const activeTab = activeTabInArray[0];
          const pageName = this.#GetPageName(activeTab.url);

          this.#LOCAL_STORAGE.get(this.#PROP.Theme, (localStorage) => {
            if (localStorage[this.#PROP.Theme]) {
              this.#DarkTheme.Inject(activeTab.id, this.#PAGE[pageName].css)
            } else {
              this.#DarkTheme.Eject(activeTab.id, this.#PAGE[pageName].css)
            }
          })
        }
    })
    return true;
  }
  
  #SyncTabs = () => {
    this.#LoadTab();

    this.#TABS.query({
      active: false,
      currentWindow: true,
      url: [
        "https://*.praktikum.yandex.ru/*",
        "https://*.practicum.yandex.com/*"]}, (query) => {

      if (this.#RUNTIME.lastError)
        this.#IsFirstLoadingIteration = true;

      try {
        query.forEach(async (currentTab) => {

          const pageName = this.#GetPageName(currentTab.url);
          this.#LOCAL_STORAGE.get(this.#PROP.Theme, (localStorage) => {
            if (!this.#TabsPerSession[currentTab.id] && localStorage[this.#PROP.Theme])
              this.#DarkTheme.Inject(currentTab.id, this.#PAGE[pageName].css)
            else if (this.#TabsPerSession[currentTab.id] && !localStorage[this.#PROP.Theme])
              this.#DarkTheme.Eject(currentTab.id, this.#PAGE[pageName].css);
          })

        });
      } catch (error) {
        setTimeout(() => this.#SyncTabs(), 10);
      }
    })
  }

  #SwitchTheme = () => {
    this.#DarkTheme.State = !this.#DarkTheme.State;
    this.#LOCAL_STORAGE.get(this.#PROP.Theme, (localStorage) => {
      this.#SaveState({ [this.#PROP.Theme]: !localStorage[this.#PROP.Theme] });
      this.#LoadTab()
    })
  }

  #Messenger = () => {

    this.#RUNTIME.onMessage.addListener((message, sender, reply) => {
      if (this.#RUNTIME.lastError) {}

      if (!message) {
        reply({ COMMAND: this.#COMMAND });
      } else if (message === this.#COMMAND.SwitchTheme) {
        this.#SwitchTheme()
        reply({ feedback: this.#CODE_STATUS.Success })
      }
    });

  }

  #RefreshingMonitor = () => {
    this.#TABS.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (this.#IsFirstLoadingIteration && changeInfo.status === this.#TABS.TabStatus.LOADING) {
        this.#IsFirstLoadingIteration = false;
        this.#SyncTabs(tabId, changeInfo, tab);
      } else if (changeInfo.status === this.#TABS.TabStatus.COMPLETE) {
        this.#IsFirstLoadingIteration = true;
      }
    })
  }

  #SwitchingTabsMonitor = () => {
    this.#TABS.onHighlighted.addListener((activeInfo) => {
      this.#IsFirstLoadingIteration = true;
      this.#LoadTab()
    })
  }

  #ClosingMonitor = () => {
    this.#TABS.onRemoved.addListener((tabId, removeInfo) => delete this.#TabsPerSession[tabId])
  }

  constructor(state = this.#DarkTheme.State,
              services = []) {
    this.#Initialize({
      [this.#PROP.Theme]: state
    });

    services.push(
      this.#Messenger,
      this.#RefreshingMonitor,
      this.#SwitchingTabsMonitor,
      this.#ClosingMonitor
    )
    this.#StartApp(services);
  }

  #StartApp = (services) => {
    for (const Service of services) Service();
  }

  #SaveState = (localStorage) => this.#LOCAL_STORAGE.set(localStorage);

  #Initialize = (localStorage) => {
    this.#RUNTIME.onInstalled.addListener(() => this.#SaveState(localStorage));
  }
}

const MAIN = (() => {
    const App = new PracticumInsider();
})()