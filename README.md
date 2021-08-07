# Кстати...
..., так вот, прежде, чем начать читать документацию, ознакомься, пожалуйста, со следующим списком ссылок:
- [Страница ведения блога о расширении](https://www.notion.so/praktikum/Practicum-Insider-002958753155467d965f3ef65d647cb1)
- [Доска задач/Roadmap](https://www.notion.so/praktikum/748f7a3f9d3148538f7935ca2b16a8d9?v=137c4e4959a948f6b1165f5f3df36225)
- [История изменений](https://www.notion.so/praktikum/7c1206ff201d438499d0613c42d0c943)

# Документация к коду
Расширение построено на основе [Chrome Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)

# Структура
В папке `src/` хранятся файлы главной страницы (которая открывается по нажатию на иконку) расширения, но сейчас она не задействована.

В папке `public/` хранятся корневые файлы расширения. То есть расширение на данный момент может спокойно работать без папки `src/`, так как `src/` на данный момент не содержит никаких реализаций.

# Технические сложности
- Изначально задумывалось написать на основе React весь код, но сейчас стало ясно, что смысла в этом пока нет, а если и есть, то нужно научить файлы из папки `public/` собираться в тот вид, в котором они сейчас. По большей части, хочется это сделать для работы с Typescript. Нужда в этом возникла из-за того, что я пришёл с C++ и я за строгую типизацию, соответственно, за явное приведение типов и явную обработку ошибок.

- Не удалось изначально сесть за задачу и спроектировать примерную сборку проекта. Поэтому теперь нужно переработать файловую структуру так, чтобы это было всё написано не на нативных файлах `.js` в папке `public/`, а из папки `src/` файлы языка Typescript традиционно компилировались в `build/public`, как это происходит сейчас, при этом расширение было легко отлаживаемо внутри браузера.

- Кажется, что в расширениях Chrome API есть множество неисправленных багов, таких как:
    - Работа метода удаления инжектированного скрипта `chrome.scripting.removeCSS(uninjection)`, объявленного внутри промиса. Данный метод не возвращает никаких значений, например `true` или `false`, тем самым от него невозможно получить возвращаемый код и убедиться в программе, что стили отключены действительно. [Текущий фикс - использование цикла](https://gitlab.com/kolyandev/practicum-insider/-/blob/master/public/main.js#L39) ;(
    - Баг с двойным нажатием для переключения из тёмной темы в светлую (вместо одиночного клика) отловлен. Описание [начинается здесь](https://gitlab.com/kolyandev/practicum-insider/-/blob/master/public/main.js#L2).

- Это скорее пункт успеха, а не сложности. В Практикуме замечена ошибка (точнее это даже не ошибка, далее об этом), что при подключении стилей по линковке `.css` файлов в структуре `html` или с неизвестных источников, на веб-факультете, в некоторых уроках не проходятся задания. Примерный вид ошибок: `Что-то пошло не так... :(`. Эта, якобы ошибка, вызвана заботой о безопасности пользователя - не позволять подключать скрипты с иных источников, кроме разрешённых, допустим любой файл по ссылке из нашего `code.s3` можно подключить и тогда уроки будут проходиться. Сейчас же, текущее решение в переключении тёмной темы не нуждается в подключении таблицы стилей по ссылкам в сайт Практикума. Решение оказалось куда проще и даже, не побоюсь этого слова, неочевидным - инъекция CSS. Наше расширение позволяет избежать всех этих багов простым безопасным методом от `manifest v3` - `chrome.scripting.insertCSS(injection)` и все уроки проходит без ошибок. На сегодняшний день - проверено (но не во всех уроках, а лишь в тех, в которых были ошибки с перезаписью стилей по ссылке), решение является рабочим.

# Краткий экскурс по `public/`
- `main.js` - фоновый скрипт или же, традиционно, `service-worker`, служит в роли back-end в расширении: обрабатывает получаемые сообщения от самого же расширения. [Подробнее об отправке сообщений здесь](https://developer.chrome.com/docs/extensions/reference/runtime/). Здесь реализован главный функционал - мозги.
- `index.js` - служит в роли front-end в расширении. С части front-end меняется всего лишь иконка внутри кнопки, для видимости. По нажатию кнопки переключения темы на странице `index.html`, отправляется сообщение расширению. `main.js` принимает сообщение и присылает ответ на запрос скрипту `index.js`. В зависимости от текущего состояния: включена тёмная тема или нет, и меняется иконка внутри кнопки.
- `index.html` - на данный момент, это просто красивая страничка для переключения темы. В дальнейшем планируется к удалению и будет оставлен только файл `options.html`, для тщательной настройки расширения. Файл `index.html` своим существованием занимает позицию в быстром доступе среди расширений, но это вообще не нужно, так как планируется, чтобы кнопка переключения тёмной темы существовала только внутри сайта Практикума. Как итог: возможность переключать тёмную тему в Практикуме будучи на любой странице/вкладке - избыточная и не нужная.
- `styles/` - папка стилей, подключаемых во время инъекцирования тёмной темы в Практикуме. Сейчас хочется, чтобы это были файлы `.scss` в исходниках.

# `main.js`
- [`constructor`](https://gitlab.com/kolyandev/practicum-insider/-/blob/master/public/main.js#L156) - содержит в себе запуск всех необходимых фоновых процессов и сервисов во время работы расширения.
    - Сперва, при установке, [`Initialize`](https://gitlab.com/kolyandev/practicum-insider/-/blob/master/public/main.js#L158) - объявление всех служебных переменных: `состояние тёмной темы - вкл/выкл?`
    - Метод `SaveState` внутри `Initialize` служит заменой длинному `chrome.storage.local.set`, хоть и `chrome.storage.local` сокращён к виду `#LOCAL_STORAGE`, я решил, что лучше отобразить явно зачем я вызываю этот метод (да, вероятно, что это в действительности погоня за избыточным объяснением, _потенциально к рефакторингу_).
    - `LoadTabs` - прогрузка всех окон Практикума и ожидание к прогрузке, учитывая сохранённый статус тёмной темы. если возникает ошибка (из-за Chrome API), при клике на вкладку, на неё адекватно можно переключиться только с помощью `ctrl + tab`, но даже если вы захотите переключиться на вкладку без долгого удержания мыши на ней, Chrome API всё равно будет думать, что вы тянете его ~~за яйца~~ вкладку и кричать что-то по типу `runtime.lastError`, решение - рекуррентный вызов LoadTabs с помощью интервалов, пока ошибка не пройдёт (т.е. пока пользователь, так сказать, не отпустит курсор)
    - Всё, что внутри [`services`](#IsFirstLoadingIteration), это Chrome-сервисы для обработки, обязательные к работе.









