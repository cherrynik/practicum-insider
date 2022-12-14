// TODO: All the app built by "bricks", "components" with TS/TSX
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
    Success: 0,
    Complete: 1
  }

  #DarkTheme = {
    Inject: (tabId, css) => {
      return new Promise((resolve, reject) => {
        this.#SCRIPTING.insertCSS({
          target: { tabId: tabId },
          files: [css]
        }, () => this.#RUNTIME.lastError ? reject() : resolve());
      }).then((resolve) => {},
              (reject) => this.#DarkTheme.Inject(tabId, css))
    },

    Eject: (tabId, css) => {
      for (let i = 0; i < 300; ++i) {
        this.#SCRIPTING.removeCSS({
          target: { tabId: tabId },
          files: [css]
        })
      }
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

  #IsFirstLoadingIteration = true;

  #GetPageName = (url) => {
    return Object.keys(this.#PAGE).find((key) => this.#PAGE[key].url.test(url));
  }

  #LoadTabs = () => {
    this.#TABS.query({
      active: true,
      url: [ // TODO: Test RegExp
        "https://*.praktikum.yandex.ru/*",
        "https://*.practicum.yandex.ru/*",
        "https://*.practicum.yandex.com/*"]}, (activeTabs) => {
        if (this.#RUNTIME.lastError || !activeTabs) {
          setTimeout(() => this.#LoadTabs(), 50);
        } else if (activeTabs.length) {
          for (let activeTab of activeTabs) {
            const pageName = this.#GetPageName(activeTab.url);
            this.#LOCAL_STORAGE.get(this.#PROP.Theme, (localStorage) => {
              if (localStorage[this.#PROP.Theme]) {
                this.#DarkTheme.Inject(activeTab.id, this.#PAGE[pageName].css)
              } else {
                this.#DarkTheme.Eject(activeTab.id, this.#PAGE[pageName].css)
              }
            })
          }
        }
    })
    return true;
  }

  #SwitchTheme = async () => {
    await this.#SaveState({ [this.#PROP.Theme]: !this.#DarkTheme.State })
    await this.#LoadTabs();
    return true;
  }

  #Messenger = () => {

    this.#RUNTIME.onMessage.addListener(async (message, sender, reply) => {
      if (this.#RUNTIME.lastError) {}

      if (!message) {
        reply({
          COMMAND: this.#COMMAND,
          CODE_STATUS: this.#CODE_STATUS
        });
      } else if (message === this.#COMMAND.SwitchTheme) {
        if (this.#SwitchTheme()) {
          reply({ feedback: this.#CODE_STATUS.Success })
        }
      }
    });

  }

  #RefreshingMonitor = () => {
    this.#TABS.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (this.#IsFirstLoadingIteration && (changeInfo.status === this.#TABS.TabStatus.LOADING)) {
        this.#IsFirstLoadingIteration = false;
        this.#LoadTabs();
      } else if (changeInfo.status === this.#TABS.TabStatus.COMPLETE) {
        this.#IsFirstLoadingIteration = true;
      }
    })
  }

  #SwitchingTabsMonitor = () => {
    this.#TABS.onHighlighted.addListener((activeInfo) => {
      this.#IsFirstLoadingIteration = true;
      this.#LoadTabs()
    })
  }

  #StartApp = (services) => {
    for (const Service of services) Service();
  }

  #SaveState = (data) => {
    this.#LOCAL_STORAGE.get(this.#PROP.Theme, (localStorage) => {
      if (JSON.stringify(data) === JSON.stringify(localStorage)) {
        this.#DarkTheme.State = !data[this.#PROP.Theme];
        this.#LOCAL_STORAGE.set({ [this.#PROP.Theme]: this.#DarkTheme.State });
        return;
      }
    })

    this.#LOCAL_STORAGE.set(data);

    this.#DarkTheme.State = data[this.#PROP.Theme];
  }

  #SaveFirstState = (data) => {
    this.#LOCAL_STORAGE.get(this.#PROP.Theme, (localStorage) => {
      if (Object.keys(localStorage).length === 0) {
        this.#LOCAL_STORAGE.set(data);

        this.#DarkTheme.State = data[this.#PROP.Theme]
      }
    })
  }

  #Initialize = (data) => {
    this.#RUNTIME.onInstalled.addListener(() => this.#SaveFirstState(data));
  }

  constructor(state = this.#DarkTheme.State,
              services = []) {
    this.#Initialize({
      [this.#PROP.Theme]: state
    });

    services.push(
      this.#Messenger,
      this.#RefreshingMonitor,
      this.#SwitchingTabsMonitor
    )
    this.#StartApp(services);
  }
}

const MAIN = (() => {
    const App = new PracticumInsider();
})()
