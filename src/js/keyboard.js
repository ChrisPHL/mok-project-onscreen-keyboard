//***********************************************************************************
//*                                                                                 *
//*            MOK Project - Multilingual Onscreen Keyboard                         *
//*                                                                                 *
//*            Author: Sean McQuay (www.seanmcquay.com)                             *
//*            De-jQuery-fied by: Christian Pohl (www.chpohl.de)                    *
//*                                                                                 *
//*            GitHub: https://github.com/ChrisPHL/mok-project-onscreen-keyboard    *
//*            Fork of: https://github.com/srm985/mok-prject                        *
//*                                                                                 *
//*            Started: March 2017                                                  *
//*            Version: 1.1.7                                                       *
//*                                                                                 *
//*            License: MIT (https://opensource.org/licenses/MIT)                   *
//*                                                                                 *
//***********************************************************************************

function getCanonicalPath(path) {
    return path.replaceAll('\\', '/').split('/')
        .reduce((a, v) => {
            if (v === '.'); // do nothing
            else if (v === '..') a.pop();
            else a.push(v);
            return a;
        }, [])
        .join('/');
}

function getCurrentScriptPath(relative) {
    if (!(typeof relative === 'boolean')) {
        throw new Error('Argument missmatch')
    }

    let error = new Error();
    let stack = error.stack;

    if (stack) {
        let stackLines = stack.split('\n');
        for (let i = 0; i < stackLines.length; i++) {
            let line = stackLines[i]
            let matches = line.match(/(?:(file:)?\/{1,3}|[a-zA-Z]:[\\/]|https?:\/\/)[^\s]+/)
            if (matches) {
                let filePath = matches[0]
                // Filter out line and column values if present
                filePath = filePath.replace(/:\d+:\d+\)?$/, '')
                if (!relative) {
                    return filePath
                } else {
                    let pathArray = window.location.pathname.split('/')
                    pathArray = pathArray.filter(value => value !== '')
                    pathArray.pop()
                    const rootPath = `${pathArray.join('/')}/`
                    // Runnning Linux we end up with the root slash missing so it will not be replaced in the following step :-/
                    let relativeFilePath = filePath.replaceAll('\\', '/').replace(rootPath, '')
                    if ('/' === relativeFilePath.charAt(0)) {
                        relativeFilePath = relativeFilePath.substring(1)
                    }
                    return relativeFilePath
                }
            }
        }
    }

    return null
}

function readFileSync(url) {
    // Untested function, use with care!
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false) // The third parameter sets the request as synchronous
    xhr.send(null)

    if (xhr.status === 200) {
        return xhr.responseText
    } else {
        throw new Error(`Failed to read the file '${url}'`)
    }
}

function keyboard(passedOptions) {
    const rtlLanguages = [
        'ar-SA',
        'fa-IR',
        'he-IL',
        'ur-PK'
    ];

    let keyMap = { '29': 0, '02': 1, '03': 2, '04': 3, '05': 4, '06': 5, '07': 6, '08': 7, '09': 8, '0a': 9, '0b': 10, '0c': 11, '0d': 12, '10': 13, '11': 14, '12': 15, '13': 16, '14': 17, '15': 18, '16': 19, '17': 20, '18': 21, '19': 22, '1a': 23, '1b': 24, '2b': 25, '1e': 26, '1f': 27, '20': 28, '21': 29, '22': 30, '23': 31, '24': 32, '25': 33, '26': 34, '27': 35, '28': 36, '2c': 37, '2d': 38, '2e': 39, '2f': 40, '30': 41, '31': 42, '32': 43, '33': 44, '34': 45, '35': 46 };

    let deadkeyObject;
    let deadkeyPressed = '';
    let deadkeySet = false;
    let focusedInputField;
    let inputFieldType = 'text';
    let keyStatusObject = { shift: false, caps: false, altgrp: false, shift_altgrp: '' };
    let keyboardInputType = 'text';
    let keyboardOpen = false;
    let keyboardStreamField;
    let languageArrayPosition = 0;
    let ligatureObject;
    let localeName = '';
    let pageElement = document.getElementsByTagName('body')[0]; // formerly $(this)
    let resizeTimerActive = false;
    let shiftStateObject;
    let storedKeyboardObject = { keyboardFile: '', arrayPosition: '' };
    let textFlowDirection = 'LTR';
    let keyboardStreamFieldTextColorOrig = null;

    const KEYBOARD_VERSION = '1.1.7';
    const LANGUAGE_KEY_DEFAULT = 'Language';
    const LANGUAGE_MAP_SPLIT_CHAR = ':';
    const TRIGGER_KEYBOARD_FLAG = 'triggerkeyboard';

    const CDN_LANGUAGES_DIRECTORY = `https://cdn.jsdelivr.net/npm/mok-project@${KEYBOARD_VERSION}/dist/languages`;

    const LOCALE_VALIDATION_REGEX = '^[a-z]{2,3}(?:-[A-Z][a-z]{2,3})?(?:-[A-Z]{2,3})$'

    const getLocale = () => {
        if (window.Intl) {
            let locale = window.navigator.language || window.navigator.userLanguage
            let languageCode = locale.split("-")[0]
            let countryCode = locale.split("-")[1]
            let formattedLocale = languageCode
            if (countryCode) {
                formattedLocale += "-" + countryCode.toUpperCase()
            } else {
                formattedLocale += "-" + languageCode.toUpperCase()
            }
            return formattedLocale
        } else {
            console.log('Internationalization API not supported.')
            return null
        }
    }

    const getLanguageFileByLocale = (locale) => {
        // This function is a Node.js only feature.
        try {
            const fs = require('fs')

            const directoryPath = getCanonicalPath(`${getCurrentScriptPath(false)}` + '/../../languages/')
            const files = fs.readdirSync(directoryPath)

            for (let prop in files) {
                const file = files[prop]
                const filePath = getCanonicalPath(directoryPath + file)
                let fileExtension = ''
                try {
                    fileExtension = file.split('.').pop()
                } catch (error) {
                    continue
                }
                if (fileExtension === 'klc') {
                    const fileContents = fs.readFileSync(filePath, 'utf-16le')
                    const match = fileContents.match(new RegExp(`LOCALENAME\\s+"${locale}"`))

                    if (match) {
                        console.log('File found:', file)
                        return file
                    }
                }
            };
        } catch (error) {
            return null
        }
        return null
    }

    // Build out our language list from input string.
    const constructLanguageList = (language) => {
        language = language.split(',').map(splitLanguage => splitLanguage.trim())

        // Replace all LOCALE like language variables with their file name pendant:
        for (let prop in language) {
            lang = language[prop]
            if (lang.split(':')[0].match(LOCALE_VALIDATION_REGEX)) {
                lang = language.splice(prop, 1)[0]
                try {
                    lang = getLanguageFileByLocale(lang.split(':')[0]).split('.klc')[0] + ':' + lang.split(':')[1]
                } catch (error) {
                    // Do not alter the entry and push it back.
                }
                language.splice(prop, 1, lang)
            }
        }

        try {
            const defaultLanguage = getLanguageFileByLocale(getLocale()).split('.')[0]
            // Find the index of the default language
            let defaultIndex = language.findIndex(lang => lang.startsWith(defaultLanguage + ':'))
            // Move the default language to the first slot if it exists
            if (defaultIndex !== -1) {
                let defaultLang = language.splice(defaultIndex, 1)[0]
                language.unshift(defaultLang)
            }
        } catch (error) {
            // In case of an error we're simply not able to find the default language...
        }
        return language
    }

    const hideLanguageKeyOnSingleItemLanguageList = (showLanguageKey, language) => {
        return language.match(/,/g) === null ? false : showLanguageKey
    }

    // Define our default options.
    const initOptions = ({
        acceptColor = '#2ECC71',
        acceptTextColor = '#FFFFFF',
        allowEnterAccept = true,
        allowEscapeCancel = true,
        altKey = '',
        blackoutColor = '25, 25, 25, 0.9',
        cancelColor = '#E74C3C',
        cancelTextColor = '#FFFFFF',
        capsLightColor = '#3498DB',
        ctrlKey = '',
        directEnter = false,
        enterKey = '',
        inputFieldRegex = { number: /^(-)?(((\d+)|(\d+\.(\d+)?)|(\.(\d+)?))([eE]([-+])?(\d+)?)?)?$/ },
        inputType = '',
        isPermanentUppercase = false,
        keyCharacterRegex = { number: /[0-9]|[eE]|\.|\+|-/, tel: /[0-9]|\.|\+|-|#|\(|\)/ },
        keyColor = '#E0E0E0',
        keyTextColor = '#555555',
        keyboardPosition = 'bottom',
        language = getLanguageFileByLocale(getLocale()).split('.')[0],
        languageKey = '',
        languageKeyTextColor = '#3498db',
        showSelectedLanguage = false,
        spareKey = '',
        specifiedFieldsOnly = false,
        tabKey = '',
        bkspInsteadOfRightShiftKey = false,
        shortBkspKey = false,
        showCapsLockKey = true,
        shortCapsLockKey = false,
        showTabKey = true,
        shortTabKey = false,
        showEnterKey = true,
        shortEnterKey = false,
        shortShiftKey = false,
        showCtrlKey = true,
        showLanguageKey = true,
        showAltKey = true,
        showSpareKey = true,
        loadExternalKeyboardFiles = false,
        boldKeyWritings = false,
        acceptKeyWriting = 'Accept',
        cancelKeyWriting = 'Cancel',
        acceptKeyIcon = undefined,
        cancelKeyIcon = undefined,
        acceptKey = '',
        cancelKey = ''
    }) => ({
        acceptColor,
        acceptTextColor,
        allowEnterAccept,
        allowEscapeCancel,
        altKey,
        blackoutColor,
        cancelColor,
        cancelTextColor,
        capsLightColor,
        ctrlKey,
        directEnter,
        enterKey,
        inputFieldRegex,
        inputType: setInputType(inputType),
        isPermanentUppercase,
        keyboardPosition,
        keyCharacterRegex,
        keyColor,
        keyTextColor,
        language: constructLanguageList(language),
        languageKey,
        languageKeyTextColor,
        showSelectedLanguage,
        spareKey,
        specifiedFieldsOnly,
        tabKey,
        bkspInsteadOfRightShiftKey,
        shortBkspKey,
        showTabKey,
        shortTabKey,
        showEnterKey,
        shortEnterKey,
        shortShiftKey,
        showCtrlKey,
        showLanguageKey: hideLanguageKeyOnSingleItemLanguageList(showLanguageKey, language),
        showAltKey,
        showSpareKey,
        showCapsLockKey,
        shortCapsLockKey,
        loadExternalKeyboardFiles,
        boldKeyWritings,
        acceptKeyWriting,
        cancelKeyWriting,
        acceptKeyIcon,
        cancelKeyIcon,
        acceptKey,
        cancelKey
    });

    const options = initOptions(passedOptions);

    //*****Define our attributes that we care about.*****
    let inputAttributes = {
        disabled: '',
        readonly: '',
        maxlength: '',
        min: '',
        max: '',
        placeholder: '',
        onInput: '',
        inputFilter: ''
    };

    //***********************************************************************************
    //*             Return our selected input types as a formatted string.              *
    //***********************************************************************************
    function setInputType(inputType) {
        let inputTypeArray = new Array(),
            formattedString = '';

        if (inputType !== undefined && inputType != '') {
            inputTypeArray = inputType.trim().split(',');
            inputTypeArray.forEach(function (value) {
                if (value.trim().toString() == 'contenteditable') {
                    formattedString += '[contenteditable="true"], ';
                } else if (value.trim().toString() == 'textarea') {
                    formattedString += 'textarea, ';
                } else {
                    formattedString += 'input[type="' + value.trim().toString() + '"], ';
                }
            });
            formattedString = formattedString.slice(0, -2);
        } else {
            formattedString = 'input[type="text"], input[type="number"], input[type="password"], input[type="search"], input[type="tel"], input[type="url"], textarea, [contenteditable="true"]';
        }
        return (formattedString);
    }

    init();

    function init() {
        readKeyboardFile();

        //*****Add our event listeners once everything has been materialized.*****
        function handleInputFieldClick(event) {
            const {
                specifiedFieldsOnly
            } = options;

            let parentElementIterator = event.target;

            if (parentElementIterator.getAttribute('contenteditable') !== 'true' &&
                parentElementIterator.tagName.toLowerCase() !== 'input') {
                // Not a valid input field.
                return
            }

            while (parentElementIterator.tagName.toLowerCase() !== 'body') {
                if (parentElementIterator.classList.contains('keyboard-wrapper') ||
                    parentElementIterator.classList.contains('keyboard-blackout-background')
                ) {
                    return
                }
                parentElementIterator = parentElementIterator.parentNode
            }

            const tempElement = event.target;
            // Check if we're only allowing the keyboard on certain fields.
            if (specifiedFieldsOnly) {
                const isTriggerField = tempElement.dataset[TRIGGER_KEYBOARD_FLAG] || false;

                if (!isTriggerField) {
                    return;
                }
            }

            //*****Let's capture a few attributes about our input field.*****
            for (let prop in inputAttributes) {
                inputAttributes[prop] = tempElement.getAttribute(prop) === undefined ? '' : tempElement.getAttribute(prop);
            };

            if (!inputAttributes.disabled && !inputAttributes.readonly) {
                if (!event.target) {
                    console.log(`FIXME: event.target seems to be undefined which it shouldn't at this point.`)
                }
                focusedInputField = event.target;
                keyboardStreamField = focusedInputField;

                //*****If direct enter enabled, don't bother.*****
                const configureKeyboard = () => {
                    keyboardStreamField = document.getElementsByClassName('keyboard-input-field')[0];
                    if (!keyboardStreamField) {
                        setTimeout(configureKeyboard, 10)
                        return
                    }
                    if (focusedInputField.tagName === 'INPUT') {
                        inputFieldType = focusedInputField.type;
                        keyboardInputType = inputFieldType === 'password' ? 'password' : 'text';

                        keyboardStreamField.placeholder = inputAttributes.placeholder
                        keyboardStreamField.value = focusedInputField.value.trim();
                        keyboardStreamField.type = keyboardInputType;
                    } else {
                        inputFieldType = 'text';
                        keyboardStreamField.value = focusedInputField.innerHTML.trim();
                        keyboardStreamField.type = 'text';
                    }
                    const background = document.getElementsByClassName('keyboard-blackout-background')[0]
                    if (!background) {
                        setTimeout(configureKeyboard, 10)
                        return
                    }
                    background.style.display = 'block'

                    const wrapper = document.getElementsByClassName('keyboard-wrapper')[0]
                    if (!wrapper) {
                        setTimeout(configureKeyboard, 10)
                        return
                    }
                    wrapper.style.display = 'block'

                    keyboardOpen = true;
                    keyboardStreamField.focus();
                }

                if (!options.directEnter) {
                    setTimeout(configureKeyboard, 1)
                }
            }
        }

        pageElement.addEventListener('click', handleInputFieldClick);
        pageElement.addEventListener('touch', handleInputFieldClick);


        //*****Listen for keypresses.*****
        function handleKeyboardKeyClick(event) {
            const keyRegistered = event.target.dataset.keyval;
            handleKeypress(keyRegistered);
        }

        document.body.addEventListener('click', function (event) {
            if (event.target.classList.contains('keyboard-key')) {
                handleKeyboardKeyClick(event);
            }
        });

        document.body.addEventListener('touch', function (event) {
            if (event.target.classList.contains('keyboard-key')) {
                handleKeyboardKeyClick(event);
            }
        });


        //*****Handle our keyboard close button.*****
        document.addEventListener('click', function (event) {
            if (event.target.classList.contains('keyboard-cancel-button')) {
                discardData();
            }
        });

        document.addEventListener('touch', function (event) {
            if (event.target.classList.contains('keyboard-cancel-button')) {
                discardData();
            }
        });

        //*****Handle our keyboard accept button.*****
        document.addEventListener('click', function (event) {
            if (event.target.classList.contains('keyboard-accept-button')) {
                acceptData();
            }
        });

        document.addEventListener('touch', function (event) {
            if (event.target.classList.contains('keyboard-accept-button')) {
                acceptData();
            }
        });

        //*****Handle closure of direct-enter keyboard on element clickaway.*****
        function handleDocumentClick(event) {
            event.stopPropagation();
            if (keyboardOpen && options.directEnter) {
                let elementLayer = event.target;
                if (
                    options.inputType.search(elementLayer.getAttribute('type')) < 1 &&
                    options.inputType.search(elementLayer.tagName.toLowerCase()) < 1 &&
                    elementLayer.getAttribute('contenteditable') !== 'true'
                ) {
                    while (elementLayer.parentNode && !elementLayer.classList.contains('keyboard-wrapper')) {
                        elementLayer = elementLayer.parentNode;
                    }
                    if (elementLayer === document || !elementLayer.classList.contains('keyboard-wrapper')) {
                        clearKeyboardState();
                        keyboardOpen = false;
                        readKeyboardFile();
                    }
                }
            }
        }

        document.addEventListener('click', handleDocumentClick);
        document.addEventListener('touch', handleDocumentClick);

        //*****Provide a little functionality during external keyboard testing.*****

        document.addEventListener('keydown', function (event) {
            hardwareKeypress(event);
        });
    }

    //***********************************************************************************
    //*                    Handle specific hardware keypresses                          *
    //***********************************************************************************
    function hardwareKeypress(event) {
        const keyboardWrapper = document.querySelector('.keyboard-wrapper');
        if (keyboardWrapper && keyboardWrapper.style.display !== 'none') {
            switch (event.which) {
                case 13:
                    if (options.allowEnterAccept) {
                        acceptData();
                        event.preventDefault();
                    }
                    break;
                case 27:
                    if (options.allowEscapeCancel) {
                        discardData();
                        event.preventDefault();
                    }
                    break;
            }
            if (keyboardStreamField) {
                checkInputFilter(keyboardStreamField.value)
            }
        }
    }

    //***********************************************************************************
    //*         Read our keyboard file and parse information into usable tables         *
    //***********************************************************************************
    function readKeyboardFile() {
        // Separate our language file name from mapped name.
        const selectedLanguageFileName = () => {
            const { language } = options;
            const languageFileName = language[languageArrayPosition]
                .split(LANGUAGE_MAP_SPLIT_CHAR)[0]
                .trim();
            return languageFileName;
        };

        const file = selectedLanguageFileName();

        if (storedKeyboardObject.keyboardFile !== '' && storedKeyboardObject.arrayPosition === languageArrayPosition) {
            parseKeyboardFile(file, storedKeyboardObject.keyboardFile);
        } else {
            // Handle our keyboard file once successfully read.
            const handleSuccess = (data) => {
                storedKeyboardObject.keyboardFile = data;
                storedKeyboardObject.arrayPosition = languageArrayPosition;
                parseKeyboardFile(file, data);
            };

            // See if there is a local language file, otherwise default to CDN.

            let localKlcFile = getCanonicalPath(`${getCurrentScriptPath(true)}/../../languages/${file}.klc`)
            fetch(localKlcFile)
                .then((response) => {
                    if (response.ok) {
                        return response.text();
                    } else {
                        throw new Error('Local language file not found');
                    }
                })
                .then((data) => {
                    handleSuccess(data);
                })
                .catch(() => {
                    // No local languages, try the CDN.
                    if (options.loadExternalKeyboardFiles) {
                        fetch(`${CDN_LANGUAGES_DIRECTORY}/${file}.klc`)
                            .then((response) => {
                                if (response.ok) {
                                    return response.text();
                                } else {
                                    throw new Error('Language file not found');
                                }
                            })
                            .then((data) => {
                                handleSuccess(data);
                            })
                            .catch((error) => {
                                console.error(error);
                            });
                    } else {
                        throw new Error(`Language file not found. ('${localKlcFile}')`);
                    }
                });
        }
    }


    //***********************************************************************************
    //*                      Parse information from keyboard file.                      *
    //***********************************************************************************
    function parseKeyboardFile(file, data) {
        let keyData,
            shiftStateData,
            shiftStateLocation = '',
            deadkeyData,
            deadkeyLocation = '',
            ligatureData,
            ligatureLocation = '',
            tempArr = new Array(),
            tempObject;

        shiftStateObject = '';
        deadkeyObject = '';
        ligatureObject = '';

        //*****Extract our keyboard key data.*****
        data = data.replace(/\u0000/g, '');
        keyData = data.match(/\d(\w)?\s+\w+\s+\d\s+(-1|\w+@?|%%)\s+(-1|\w+@?|%%)\s+(-1|\w+@?|%%)(\s+(-1|\w+@?|%%))?(\s+(-1|\w+@?|%%))?(\s+(-1|\w+@?|%%))?\s+\/\//g);

        const [
            extractedLocaleName
        ] = data.match(/LOCALENAME\s+".*"/);

        // Storing our locale name so that we can set certain language attributes.
        localeName = extractedLocaleName.replace(/LOCALENAME\s+"(.*)"/, '$1');

        //*****Extract our shift state data and convert to lookup table.*****
        shiftStateLocation = data.indexOf('SHIFTSTATE');
        if (shiftStateLocation > 0) {
            shiftStateData = data.slice(shiftStateLocation, data.indexOf('LAYOUT')).trim().split(/\n/g);
            shiftStateData.splice(0, 2);
            shiftStateObject = {};
            for (let prop in shiftStateData) {
                if (shiftStateData[prop].indexOf(':') === -1) {
                    shiftStateObject['default'] = parseInt(shiftStateData[prop].match(/\w{6}\s[0-9]/).toString().slice(-1));
                } else if (shiftStateData[prop].indexOf('Shft  Ctrl Alt') !== -1) {
                    shiftStateObject['shift_altgrp'] = parseInt(shiftStateData[prop].match(/\w{6}\s[0-9]/).toString().slice(-1));
                } else if (shiftStateData[prop].indexOf('Shft  Ctrl') !== -1) {
                    shiftStateObject['ctrl_shift'] = parseInt(shiftStateData[prop].match(/\w{6}\s[0-9]/).toString().slice(-1));
                } else if (shiftStateData[prop].indexOf('Ctrl Alt') !== -1) {
                    shiftStateObject['altgrp'] = parseInt(shiftStateData[prop].match(/\w{6}\s[0-9]/).toString().slice(-1));
                } else if (shiftStateData[prop].indexOf('Ctrl') !== -1) {
                    shiftStateObject['ctrl'] = parseInt(shiftStateData[prop].match(/\w{6}\s[0-9]/).toString().slice(-1));
                } else if (shiftStateData[prop].indexOf('Shft') !== -1) {
                    shiftStateObject['shift'] = parseInt(shiftStateData[prop].match(/\w{6}\s[0-9]/).toString().slice(-1));
                }
            };
        }


        //*****Extract our deadkey data and convert to lookup table.*****
        deadkeyLocation = data.indexOf('DEADKEY');
        if (deadkeyLocation > 0) {
            deadkeyData = data.slice(deadkeyLocation, data.indexOf('KEYNAME')).trim().split('DEADKEY');
            deadkeyData.splice(0, 1);

            deadkeyObject = {};
            for (let prop in deadkeyData) {
                tempArr = deadkeyData[prop].split(/\n/g);
                tempArr.splice(0, 2);

                tempObject = {};
                for (let prop in tempArr) {
                    tempObject[tempArr[prop].trim().slice(0, 4)] = tempArr[prop].trim().slice(5, 9);
                };

                deadkeyObject[deadkeyData[prop].trim().slice(0, 4)] = tempObject;
            };

            deadkeyObject = JSON.parse(JSON.stringify(deadkeyObject));
        }

        //*****Extract our ligature-generated keys and convert to lookup table.*****
        ligatureLocation = data.indexOf('LIGATURE');
        if (ligatureLocation > 0) {
            ligatureData = data.slice(ligatureLocation, data.indexOf('KEYNAME')).trim().split(/\n/g);
            ligatureData.splice(0, 5);

            ligatureObject = {};
            ligatureData.forEach(function (value, i) {
                if (value.indexOf('//') > 0) {
                    value = value.trim().split('//')[0].trim().replace(/\t/g, ' ').replace('  ', ' ').replace('  ', ' ').split(' ');
                    value.splice(1, 1);

                    let ligatureArr = [];
                    value.forEach(function (_value) {
                        ligatureArr.push('"' + _value + '"');
                    });

                    ligatureObject[value[0]] = ligatureArr;
                }
            });

            ligatureObject = JSON.parse(JSON.stringify(ligatureObject));
        }


        //*****Reverse input direction for specific languages.*****
        if (rtlLanguages.includes(localeName)) {
            textFlowDirection = 'RTL';
        } else {
            textFlowDirection = 'LTR';
        }

        materializeKeyboard(keyData);
    }

    //***********************************************************************************
    //*            This function handles the main buildout of our keyboard.             *
    //***********************************************************************************
    async function materializeKeyboard(keyListString) {
        let keyList = keyListString.toString().split(',');
        let keyObject = [];
        let keyMapArray = new Array(47);

        for (let prop in keyList) {
            keyObject[prop] = keyList[prop].toString().replace(/(\t+|\s+)/g, ' ');
            keyObject[prop] = keyObject[prop].split(' ');
            if (keyMap[keyObject[prop][0]] !== undefined) {
                keyMapArray[keyMap[keyObject[prop][0]]] = keyObject[prop];
            }
        };

        if (document.getElementsByClassName('keyboard-wrapper').length) {
            destroyKeys();
        } else {
            document.body.insertAdjacentHTML('afterbegin', '<div class="keyboard-wrapper"></div>');
            //*****If direct enter enabled, don't bother.*****
            if (!options.directEnter) {
                document.body.insertAdjacentHTML('afterbegin', '<div class="keyboard-blackout-background"></div>');
            }
        }

        generateRow(keyMapArray.slice(0, 13));
        generateRow(keyMapArray.slice(13, 26));
        generateRow(keyMapArray.slice(26, 37));
        generateRow(keyMapArray.slice(37, 47));

        setKeys('default');
        keyboardFillout();
        sizeKeys();
        await keyboardAttributes();
        if (!keyboardOpen) {
            //*****If direct enter enabled, don't bother.*****
            if (!options.directEnter) {
                document.querySelector('.keyboard-blackout-background').style.display = 'none';
            }
            document.querySelector('.keyboard-wrapper').style.display = 'none';
        }
    }


    //***********************************************************************************
    //*                    Append each key's individual object.                         *
    //***********************************************************************************
    function appendKey(keyObject) {
        const keyboardRow = document.querySelector('.keyboard-row:last-child');
        const keyboardKey = document.createElement('button');
        keyboardKey.className = 'keyboard-key keyboard-key-sm';
        keyboardRow.appendChild(keyboardKey);
        keyboardKey.dataset.keyDataObject = JSON.stringify(keyObject);
    }

    //***********************************************************************************
    //*                    Create row wrapper and fill with keys.                       *
    //***********************************************************************************
    function generateRow(keyListSplit) {
        const keyboardWrapper = document.querySelector('.keyboard-wrapper');
        const keyboardRow = document.createElement('div');
        keyboardRow.className = 'keyboard-row';
        keyboardWrapper.appendChild(keyboardRow);

        for (let prop in keyListSplit) {
            let keyObject;
            let value = keyListSplit[prop]
            if (value !== undefined) {
                keyObject = {
                    default: determineKey(value[shiftStateObject.default - 1], value[1]),
                    shift: determineKey(value[shiftStateObject.shift - 1], value[1]),
                    altgrp: determineKey(value[shiftStateObject.altgrp - 1], value[1]),
                    shift_altgrp: determineKey(value[shiftStateObject.shift_altgrp - 1], value[1])
                };
            } else {
                keyObject = {
                    default: '-1',
                    shift: '-1',
                    altgrp: '-1',
                    shift_altgrp: '-1'
                };
            }
            appendKey(keyObject);
        };
    }

    //***********************************************************************************
    //*                 Sort out deadkeys, ligature, and undefined.                     *
    //***********************************************************************************
    function determineKey(keyValue, VK) {
        let returnKey = keyValue;

        if (keyValue == '%%') {
            returnKey = ligatureObject[VK];
        } else if (keyValue === undefined) {
            returnKey = '-1';
        }

        return returnKey;
    }

    //***********************************************************************************
    //*      Append our extra function keys that we didn't get from the .klc file.      *
    //***********************************************************************************
    function keyboardFillout() {
        const {
            language,
            languageKeyTextColor,
            showSelectedLanguage
        } = options;

        // Check if we have mapped language names, otherwise just use file name.
        const generateLanguageName = () => {
            const extractedLanguage = language[languageArrayPosition].split(LANGUAGE_MAP_SPLIT_CHAR);

            let languageName = '';

            switch (extractedLanguage.length) {
                case 1:
                    languageName = extractedLanguage[0].toLowerCase().replace(/^\w/, c => c.toUpperCase());
                    break;
                case 2:
                    languageName = extractedLanguage[1].trim();
                    break;
                default:
                    languageName = LANGUAGE_KEY_DEFAULT;
            }

            return languageName;
        };

        const languageButtonText = showSelectedLanguage ? generateLanguageName() : LANGUAGE_KEY_DEFAULT;

        if (!document.querySelector('.keyboard-action-wrapper') && !options.directEnter) {
            const keyboardWrapper = document.querySelector('.keyboard-wrapper');
            const keyboardActionWrapper = document.createElement('div');
            keyboardActionWrapper.className = 'keyboard-action-wrapper';
            keyboardActionWrapper.innerHTML = `<button id="cancelKey" class="keyboard-action-button keyboard-cancel-button">${options.cancelKeyWriting}</button> <input type="text" class="keyboard-input-field"><button id="acceptKey" class="keyboard-action-button keyboard-accept-button">${options.acceptKeyWriting}</button>`;
            if (options.boldKeyWritings) {
                for (const child of keyboardActionWrapper.children) {
                    child.style.fontWeight = 'bold';
                }
            }
            keyboardWrapper.insertBefore(keyboardActionWrapper, keyboardWrapper.firstChild);
        }

        // Help and copy source for symbols: https://www.amp-what.com/
        const keyboardRows = document.querySelectorAll('.keyboard-row');
        if (!options.bkspInsteadOfRightShiftKey) {
            if (options.shortBkspKey) {
                keyboardRows[0].insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-sm" data-keyval="backspace">⌫</button>');
            } else {
                keyboardRows[0].insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="backspace">⌫</button>');
            }
        }

        if (options.showTabKey) {
            keyboardRows[1].insertAdjacentHTML('afterbegin', '<button class="keyboard-key keyboard-key-150" data-keyval="tab">↹</button>');
        }

        if (options.showCapsLockKey) {
            keyboardRows[2].insertAdjacentHTML('afterbegin', `<button class="keyboard-key keyboard-key-190 caps-lock-key ${options.isPermanentUppercase ? 'caps-lock-key-active' : ''}" data-keyval="caps lock">⇬</button>`);
        }
        if (options.showEnterKey) {
            keyboardRows[2].insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="enter">⏎</button>');
        }

        if (options.shortShiftKey) {
            keyboardRows[3].insertAdjacentHTML('afterbegin', '<button class="keyboard-key keyboard-key-sm" data-keyval="shift">↑</button>');
        } else {
            keyboardRows[3].insertAdjacentHTML('afterbegin', '<button class="keyboard-key keyboard-key-210" data-keyval="shift">↑</button>');
        }
        if (!options.bkspInsteadOfRightShiftKey) {
            if (options.shortShiftKey) {
                keyboardRows[3].insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-sm" data-keyval="shift">↑</button>');
            } else {
                keyboardRows[3].insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="shift">↑</button>');
            }
        } else {
            if (options.shortBkspKey) {
                keyboardRows[3].insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-sm" data-keyval="backspace">⌫</button>');
            } else {
                keyboardRows[3].insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="backspace">⌫</button>');
            }
        }

        const newKeyboardRow = document.createElement('div');
        newKeyboardRow.className = 'keyboard-row';
        if (options.showCtrlKey) {
            newKeyboardRow.insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="ctrl">Ctrl</button>');
        } else {
            newKeyboardRow.insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="" style="opacity: 0.0; cursor: default;"></button>');
        }
        if (options.showLanguageKey) {
            newKeyboardRow.insertAdjacentHTML('beforeend', `<button class="keyboard-key keyboard-key-lg language-button" data-keyval="language" style="color: ${languageKeyTextColor};">${languageButtonText}</button>`);
        } else {
            newKeyboardRow.insertAdjacentHTML('beforeend', `<button class="keyboard-key keyboard-key-lg language-button" data-keyval="" style="opacity: 0.0; cursor: default;"></button>`);
        }
        if (options.showAltKey) {
            newKeyboardRow.insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="alt">Alt</button>');
        } else {
            newKeyboardRow.insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="" style="opacity: 0.0; cursor: default;></button>');
        }
        newKeyboardRow.insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-xl" data-keyval="space">&nbsp;</button>');
        if (options.showAltKey) {
            newKeyboardRow.insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="alt grp">Alt Grp</button>');
        } else {
            newKeyboardRow.insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="" style="opacity: 0.0; cursor: default;></button>');
        }
        if (options.showSpareKey) {
            newKeyboardRow.insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="spare">&nbsp;</button>');
        } else {
            newKeyboardRow.insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="" style="opacity: 0.0; cursor: default;"></button>');
        }
        if (options.showCtrlKey) {
            newKeyboardRow.insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="ctrl">Ctrl</button>');
        } else {
            newKeyboardRow.insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="" style="opacity: 0.0; cursor: default;"></button>');
        }
        document.querySelector('.keyboard-wrapper').appendChild(newKeyboardRow);
    }


    //***********************************************************************************
    //*              Adjust sizing of keys based on our enabled options.                *
    //***********************************************************************************
    function sizeKeys() {
        const keyboardRows = document.querySelectorAll('.keyboard-row');
        const keyPadding = 2 * parseInt(getComputedStyle(document.querySelector('.keyboard-key')).marginRight.match(/[0-9]/), 10);
        const keyHeight = parseInt(getComputedStyle(keyboardRows[0].children[1]).height, 10)
        const defaultMaxKeyCount = 13

        let maxKeyCount = 1;
        keyboardRows.forEach(row => {
            const keyCount = row.children.length
            if (keyCount > maxKeyCount) {
                maxKeyCount = keyCount
            }
        })

        for (let prop in keyboardRows) {
            if ('object' !== typeof keyboardRows[prop]) {
                continue
            }
            let rowWidth, smallKeys, largeKeys, xlargeKeys, specialKeys150, specialKeys190, specialKeys210
            try {
                rowWidth = keyboardRows[prop].offsetWidth;
                smallKeys = keyboardRows[prop].querySelectorAll('.keyboard-key-sm').length;
                largeKeys = keyboardRows[prop].querySelectorAll('.keyboard-key-lg').length;
                xlargeKeys = keyboardRows[prop].querySelectorAll('.keyboard-key-xl').length;
                specialKeys150 = keyboardRows[prop].querySelectorAll('.keyboard-key-150').length;
                specialKeys190 = keyboardRows[prop].querySelectorAll('.keyboard-key-190').length;
                specialKeys210 = keyboardRows[prop].querySelectorAll('.keyboard-key-210').length;
            } catch (error) {
                console.error(`MOK-project ERROR: ${error}`)
            }

            const specialKeys150Width = specialKeys150 * keyHeight * 1.5
            const specialKeys190Width = specialKeys190 * keyHeight * 1.9
            const specialKeys210Width = specialKeys210 * keyHeight * 2.1
            const smallKeyWidth = (rowWidth - (maxKeyCount * keyPadding)) / maxKeyCount
            // Large keys shall occupy all the unsused space to fit 100% row width.
            let largeKeyWidth = rowWidth
                - ((smallKeys + largeKeys + xlargeKeys + specialKeys150 + specialKeys190 + specialKeys210) * keyPadding)
                - (smallKeys * smallKeyWidth)
                - (specialKeys150 * specialKeys150Width)
                - (specialKeys190 * specialKeys190Width)
                - (specialKeys210 * specialKeys210Width)
                - (xlargeKeys * (rowWidth / 3))
            if (0 < largeKeyWidth) {
                largeKeyWidth = largeKeyWidth / largeKeys
            } else {
                largeKeyWidth += smallKeyWidth
            }
            const xlargeKeyWidth = rowWidth / 3

            let keySmToLgKeys = []

            let keyboardKeySm = keyboardRows[prop].querySelectorAll('.keyboard-key-sm')
            for (let i = 0; i < keyboardKeySm.length; i++) {
                try {
                    if (i >= (13 - largeKeys - xlargeKeys - specialKeys150 - specialKeys190 - specialKeys210)) {
                        // sm-item #13 and above shall be adjusted to fit the row's width.
                        keyboardKeySm[i].classList.remove('keyboard-key-sm')
                        keyboardKeySm[i].classList.add('keyboard-key-lg')
                        keySmToLgKeys.push(keyboardKeySm[i])
                    } else {
                        keyboardKeySm[i].style.width = `${smallKeyWidth}px`
                    }
                } catch (error) { }
            }
            let keyboardKeyLg = keyboardRows[prop].querySelectorAll('.keyboard-key-lg')
            for (let propLg in keyboardKeyLg) {
                try {
                    keyboardKeyLg[propLg].style.width = `${largeKeyWidth}px`
                } catch (error) { }
            }
            for (let propSmToLg in keySmToLgKeys) {
                try {
                    keySmToLgKeys[propSmToLg].style.width = `${largeKeyWidth}px`
                } catch (error) { }
            }
            let keyboardKeyXl = keyboardRows[prop].querySelectorAll('.keyboard-key-xl')
            for (let propXl in keyboardKeyXl) {
                try {
                    keyboardKeyXl[propXl].style.width = `${xlargeKeyWidth}px`
                } catch (error) { }
            }
        }

        // In case there are less buttons then in at least one other row and there are no large leys we need to
        // center the content of the row.
        let maxChildrenRow = { row: null, numberOfChildren: 0 }
        keyboardRows.forEach(row => {
            // Get all child elements of the current row
            const children = Array.from(row.children)

            // Get the number of child elements in this row
            const numberOfChildren = children.length

            if (maxChildrenRow.numberOfChildren < numberOfChildren) {
                maxChildrenRow = { row: row, numberOfChildren: numberOfChildren }
            }
        })

        keyboardRows.forEach(row => {
            const children = Array.from(row.children)
            const numberOfChildren = children.length
            // Check if all children have the class 'keyboard-key-sm'
            const allHaveClass = children.every(child => child.classList.contains('keyboard-key-sm'))
            // Are there less buttons than in the row with the most buttons? So add some centering/invisible fake buttons.
            if (allHaveClass && numberOfChildren < maxChildrenRow.numberOfChildren) {
                row.style.justifyContent = 'center'
            }
        })
    }


    //***********************************************************************************
    //*                Cycle key values based on depressed function keys.               *
    //***********************************************************************************
    function setKeys(keyType) {
        let currentKey,
            keyObject,
            tempString = ''; 5
        let capsLockKey = document.querySelector('.caps-lock-key')

        if (keyStatusObject.caps && !keyStatusObject.shift && !keyStatusObject.altgrp && !options.isPermanentUppercase) {
            keyType = 'default';
            if (capsLockKey) {
                capsLockKey.classList.add('caps-lock-key-active');
            }
        } else if (!keyStatusObject.caps && !keyStatusObject.shift && !keyStatusObject.altgrp) {
            keyType = 'default';
        }

        if (!keyStatusObject.caps && !options.isPermanentUppercase) {
            if (capsLockKey) {
                capsLockKey.classList.remove('caps-lock-key-active');
            }
        }

        if (keyStatusObject.shift_altgrp !== '' && keyType !== 'shift_altgrp') {
            keyStatusObject.shift_altgrp = '';
        }

        let keyboardKeys = document.querySelectorAll('.keyboard-key')
        for (let prop in keyboardKeys) {
            currentKey = keyboardKeys[prop]
            tempString = '';
            try {
                keyObject = JSON.parse(currentKey.dataset.keyDataObject);

                if (keyObject[keyType].length === 4) {
                    currentKey.innerHTML = '&#x' + keyObject[keyType] + ';';
                    currentKey.dataset.keyval = currentKey.innerHTML;
                } else if (keyObject[keyType].length === 5 && keyObject[keyType].includes('@')) {
                    currentKey.innerHTML = '&#x' + keyObject[keyType].replace('@', '') + ';';
                    currentKey.dataset.keyval = currentKey.innerHTML;
                } else if (Array.isArray(keyObject[keyType])) {
                    keyObject[keyType].forEach(value => {
                        tempString += '&#x' + value + ';';
                    });
                    currentKey.innerHTML = tempString;
                    currentKey.dataset.keyval = currentKey.innerHTML;
                } else if (keyObject[keyType] === '-1' || keyObject[keyType] === '%%' || keyObject[keyType].length === 0) {
                    currentKey.innerHTML = '&nbsp;';
                    currentKey.dataset.keyval = '';
                } else {
                    currentKey.innerHTML = keyObject[keyType];
                    currentKey.dataset.keyval = currentKey.innerHTML;
                }

                if ((!keyStatusObject.shift && keyStatusObject.caps && !keyStatusObject.altgrp) || options.isPermanentUppercase) {
                    currentKey.innerHTML = currentKey.innerHTML.length === 1 ? currentKey.innerHTML.toUpperCase() : currentKey.innerHTML;
                    currentKey.dataset.keyval = currentKey.innerHTML.length === 1 ? currentKey.innerHTML : currentKey.dataset.keyval;
                }
            } catch (err) {
                // Ignore errors
            }
        };
    }


    //***********************************************************************************
    //*     Read and subsequently write our depressed key to the appropriate form.      *
    //***********************************************************************************
    function handleKeypress(keyPressed) {
        let deadkeyLookup = ('0000' + keyPressed.charCodeAt(0).toString(16)).slice(-4);
        let caretPosition = keyboardStreamField.selectionStart;

        keyPressed = keyPressed.replace('&lt;', '<').replace('&gt;', '>').replace(/\bspace/, ' ');

        if (keyPressed.length > 2) {
            deadkeyPressed = '';
            switch (keyPressed) {
                case 'shift':
                    keyStatusObject.shift = !keyStatusObject.shift;
                    keyStatusObject.caps = false;
                    keyStatusObject.altgrp = false;
                    if (keyStatusObject.shift_altgrp === 'altgrp') {
                        setKeys('shift_altgrp');
                        keyStatusObject.shift_altgrp = '';
                    } else if (keyStatusObject.shift_altgrp === 'shift') {
                        setKeys('shift');
                        keyStatusObject.shift_altgrp = '';
                    } else {
                        setKeys('shift');
                        keyStatusObject.shift_altgrp = 'shift';
                    }
                    break;
                case 'caps lock':
                    keyStatusObject.shift = false;
                    keyStatusObject.caps = !keyStatusObject.caps;
                    keyStatusObject.altgrp = false;
                    setKeys('caps');
                    break;
                case 'alt grp':
                    keyStatusObject.shift = false;
                    keyStatusObject.caps = false;
                    keyStatusObject.altgrp = !keyStatusObject.altgrp;
                    if (keyStatusObject.shift_altgrp === 'shift') {
                        setKeys('shift_altgrp');
                        keyStatusObject.shift_altgrp = '';
                    } else if (keyStatusObject.shift_altgrp === 'altgrp') {
                        setKeys('altgrp');
                        keyStatusObject.shift_altgrp = '';
                    } else {
                        setKeys('altgrp');
                        keyStatusObject.shift_altgrp = 'altgrp';
                    }
                    break;
                case 'backspace':
                    if (0 !== caretPosition) {
                        keyboardStreamField.value = keyboardStreamField.value.slice(0, caretPosition - 1) + keyboardStreamField.value.slice(caretPosition);
                        caretPosition -= 1;
                    }
                    keyboardStreamField.focus();
                    keyboardStreamField.selectionStart = caretPosition;
                    keyboardStreamField.selectionEnd = caretPosition;
                    break;
                case 'space':
                    // We insert a space character within the string each time the space bar is pressed.
                    break;
                case 'enter':
                    if (options.enterKey && typeof options.enterKey === 'function') {
                        options.enterKey();
                    }
                    break;
                case 'tab':
                    if (options.tabKey && typeof options.tabKey === 'function') {
                        options.tabKey();
                    }
                    break;
                case 'ctrl':
                    if (options.ctrlKey && typeof options.ctrlKey === 'function') {
                        options.ctrlKey();
                    }
                    break;
                case 'alt':
                    if (options.altKey && typeof options.altKey === 'function') {
                        options.altKey();
                    }
                    break;
                case 'language':
                    if (languageArrayPosition < options.language.length - 1) {
                        languageArrayPosition++;
                    } else {
                        languageArrayPosition = 0;
                    }
                    clearKeyboardState();
                    readKeyboardFile();
                    if (options.languageKey && typeof options.languageKey === 'function') {
                        options.languageKey();
                    }
                    break;
                case 'spare':
                    if (options.spareKey && typeof options.spareKey === 'function') {
                        options.spareKey();
                    }
                    break;
            }
        } else {
            keyStatusObject.shift = false;
            keyStatusObject.altgrp = false;
            setKeys('default');
            deadkeyPressed = deadkeyObject[deadkeyLookup];
            if (deadkeyPressed || deadkeySet) {
                keyPressed = '';
                if (deadkeyPressed === undefined && deadkeySet) {
                    let combinedKey = String.fromCharCode('0x' + deadkeySet[deadkeyLookup]);
                    if (combinedKey && deadkeySet[deadkeyLookup] !== undefined) {
                        keyPressed = combinedKey;
                    }
                }
                deadkeySet = deadkeyPressed;
            }

            //*****Write key value and update input attributes.*****
            keyboardStreamField.setAttribute('dir', textFlowDirection);
            //*****Store before and after copies in case we need to revert.*****
            let tempString = keyboardStreamField.value;
            let newString;
            keyboardStreamField.value = keyboardStreamField.value.slice(0, caretPosition) + keyPressed + keyboardStreamField.value.slice(caretPosition);
            newString = keyboardStreamField.value;

            //*****Here we check if adding a character violated any user-defined rules. We check after the fact because of ligature and dead keys.*****
            if ((inputAttributes.maxlength !== '-1' && inputAttributes.maxlength !== '' && inputAttributes.maxlength !== null && newString.length > inputAttributes.maxlength)
                || (inputFieldType === 'number' && inputAttributes.max !== '' && inputAttributes.max !== null && inputAttributes.max !== '-1' && (newString * 1) > (inputAttributes.max * 1))
                || (inputFieldType === 'number' && inputAttributes.min !== '' && inputAttributes.min !== null && inputAttributes.min !== '-1' && (newString * 1) < (inputAttributes.min * 1))
                || keyPressed.search(options.keyCharacterRegex[inputFieldType]) < 0
                || newString.search(options.inputFieldRegex[inputFieldType]) < 0) {
                keyboardStreamField.value = tempString;
                caretPosition--;
            }
            //*****************************************************************************************************************************************

            //*****Return focus and update caret position.*****
            caretPosition += keyPressed.length;
            keyboardStreamField.focus();
            keyboardStreamField.selectionStart = caretPosition;
            keyboardStreamField.selectionEnd = caretPosition;
        }
        checkInputFilter(keyboardStreamField.value)


        if (keyboardStreamField.value.length == 0) {
            resetInputFieldTextColor()
        }
    }

    function checkInputFilter(string) {
        if (inputAttributes.inputFilter !== '' && inputAttributes.inputFilter !== null) {
            let regex = new RegExp(inputAttributes.inputFilter);
            const acceptKey = document.getElementById('acceptKey')
            acceptKey.style.transition = 'background-color 1s ease-in-out'
            if (regex.test(string)) {
                acceptKey.disabled = false
                acceptKey.style.backgroundColor = options.acceptColor
                resetInputFieldTextColor()
            } else {
                if (null === keyboardStreamFieldTextColorOrig) {
                    keyboardStreamFieldTextColorOrig = keyboardStreamField.style.color
                }
                keyboardStreamField.style.color = options.cancelColor
                acceptKey.disabled = true
                acceptKey.style.backgroundColor = 'lightgrey'
            }
        }
    }
    function resetInputFieldTextColor() {
        if (null !== keyboardStreamFieldTextColorOrig) {
            keyboardStreamField.style.color = keyboardStreamFieldTextColorOrig
        }
    }

    //***********************************************************************************
    //*                       Discard keyboard data and close.                          *
    //***********************************************************************************
    function discardData() {
        if (undefined !== keyboardStreamField) {
            keyboardStreamField.value = '';
        }
        if (options.cancelKey && typeof options.cancelKey === 'function') {
            options.cancelKey(focusedInputField);
        }
        resetInputFieldTextColor()
        clearKeyboardState();
        keyboardOpen = false;
        // readKeyboardFile();
        // Just make the keyboard invisble instead of reading the complete keyboard file again..:
        if (!options.directEnter) {
            document.querySelector('.keyboard-blackout-background').style.display = 'none';
        }
        document.querySelector('.keyboard-wrapper').style.display = 'none';
    }

    //***********************************************************************************
    //*                   Submit keyboard data to form and close.                       *
    //***********************************************************************************
    function acceptData() {
        setTimeout(() => {
            try {
                if (inputAttributes.inputFilter !== '' && inputAttributes.inputFilter !== null) {
                    let regex = new RegExp(inputAttributes.inputFilter);
                    if (!regex.test(keyboardStreamField.value)) {
                        discardData()
                        return
                    }
                }
                if (focusedInputField.tagName === 'INPUT') {
                    focusedInputField.value = keyboardStreamField.value;
                } else {
                    focusedInputField.innerHTML = keyboardStreamField.value;
                }
                keyboardStreamField.value = '';
            } catch (error) {
                console.log(`FIXME: focusedInputField seems to be undefined which it shouldn't at this point.`, error)
                // FIXME: Maybe it's fixed due to "yielding" using setTimeout()..?
            }
            if (options.acceptKey && typeof options.acceptKey === 'function') {
                options.acceptKey(focusedInputField);
            }
            resetInputFieldTextColor()
            clearKeyboardState();
            keyboardOpen = false;
            readKeyboardFile();
            if (inputAttributes['onInput'] && typeof window[inputAttributes['onInput']] === 'function') {
                window[inputAttributes['onInput']]();
            }
        }, 1)
    }

    //***********************************************************************************
    //*                Provide some styling options for our keyboard.                   *
    //***********************************************************************************
    function getViewportAndKeyboardDimensions() {
        return new Promise((resolve) => {
            function fetchDimensions() {
                let viewportWidth = window.innerWidth;
                let viewportHeight = window.innerHeight;

                let keyboardWrapper = document.querySelector('.keyboard-wrapper');
                let keyboardHeight = keyboardWrapper ? keyboardWrapper.offsetHeight : 0;
                let keyboardWidth = keyboardWrapper ? keyboardWrapper.offsetWidth : 0;

                // Check if any value is still zero
                if (
                    viewportWidth === 0 ||
                    viewportHeight === 0 ||
                    keyboardHeight === 0 ||
                    keyboardWidth === 0
                ) {
                    // Retry after a short delay
                    setTimeout(fetchDimensions, 50);
                } else {
                    // All values are non-zero, resolve the Promise
                    resolve({
                        viewportWidth,
                        viewportHeight,
                        keyboardHeight,
                        keyboardWidth
                    });
                }
            }

            fetchDimensions();
        });
    }
    async function keyboardAttributes() {
        const dimensions = await getViewportAndKeyboardDimensions();
        console.log('Dimensions acquired:', dimensions);

        let keyboardKeys = document.querySelectorAll('.keyboard-key');
        for (prop in keyboardKeys) {
            try {
                keyboardKeys[prop].style.backgroundColor = options.keyColor;
                if ('language' === keyboardKeys[prop].dataset.keyval) {
                    keyboardKeys[prop].style.color = options.languageKeyTextColor;
                } else {
                    keyboardKeys[prop].style.color = options.keyTextColor;
                }
                if (options.boldKeyWritings) {
                    keyboardKeys[prop].style.fontWeight = 'bold';
                }
            } catch (error) {
                // In case 'prop' === 'entries' and such...
            }
        };

        //*****If direct enter enabled, don't bother setting these.*****
        if (!options.directEnter) {
            let cancelButton = document.querySelector('.keyboard-cancel-button');
            let acceptButton = document.querySelector('.keyboard-accept-button');
            let blackoutBackground = document.querySelector('.keyboard-blackout-background');

            cancelButton.style.backgroundColor = options.cancelColor;
            cancelButton.style.color = options.cancelTextColor;
            acceptButton.style.backgroundColor = options.acceptColor;
            acceptButton.style.color = options.acceptTextColor;
            blackoutBackground.style.backgroundColor = `rgba(${options.blackoutColor})`;
        }
        //**************************************************************

        switch (options.keyboardPosition) {
            case 'top':
                document.querySelector('.keyboard-wrapper').style.top = '20px';
                break;
            case 'middle':
                document.querySelector('.keyboard-wrapper').style.top = `${(dimensions.viewportHeight - dimensions.keyboardHeight) / 2}px`;
                break;
            default:
                document.querySelector('.keyboard-wrapper').style.bottom = '20px';
        }
        document.querySelector('.keyboard-wrapper').style.left = `${(dimensions.viewportWidth - dimensions.keyboardWidth) / 2}px`;
    }


    //***********************************************************************************
    //*                    Strip our keyboard element from page.                        *
    //***********************************************************************************
    function destroyKeyboard() {
        clearKeyboardState();
        let keyboardWrapper = document.querySelector('.keyboard-wrapper');
        if (keyboardWrapper) {
            keyboardWrapper.remove();
        }
    }


    //***********************************************************************************
    //*                      Strip keys from keyboard element.                          *
    //***********************************************************************************
    function destroyKeys() {
        clearKeyboardState();
        let keyboardRows = document.querySelectorAll('.keyboard-row');
        keyboardRows.forEach(row => {
            row.remove();
        });
    }



    //***********************************************************************************
    //*                  Reset all of our keyboard function keys.                       *
    //***********************************************************************************
    function clearKeyboardState() {
        for (let property in keyStatusObject) {
            if (keyStatusObject.hasOwnProperty(property)) {
                keyStatusObject[property] = false;
            }
        }
    }

    //***********************************************************************************
    //*                         Listen for window resizing.                             *
    //***********************************************************************************
    document.addEventListener('resize', (event) => {
        //*****Prevent multiple function calls.*****
        if (!resizeTimerActive) {
            resizeTimerActive = true;
            setTimeout(function () {
                readKeyboardFile();
                resizeTimerActive = false;
            }, 200);
        }
    });
}

const isNode = new Function("try {return this===global;}catch(e){return false;}");

if (isNode()) {
    // Running in Node.js environment, wrapping the code here...
    (function (window, document) {
        function setupKeyboard() {
            document.keyboard = keyboard
            document.dispatchEvent(new CustomEvent('import_done', { detail: { file: getCurrentScriptPath(true) } }))
        }
        document.addEventListener('DOMContentLoaded', function () {
            setupKeyboard()
        })
        window.setupKeyboard = setupKeyboard
    })(window, document)
}
else {
    document.keyboard = keyboard
}
