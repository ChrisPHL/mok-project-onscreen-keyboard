//***********************************************************************************
//*                                                                                 *
//*            MOK Project - Multilingual Onscreen Keyboard                         *
//*                                                                                 *
//*            Author: Sean McQuay (www.seanmcquay.com)                             *
//*                                                                                 *
//*            GitHub: https://github.com/srm985/mok-project                        *
//*                                                                                 *
//*            Started: March 2017                                                  *
//*            Version: 1.1.7                                                       *
//*                                                                                 *
//*            License: MIT (https://opensource.org/licenses/MIT)                   *
//*                                                                                 *
//***********************************************************************************
(function (document) {
    document.addEventListener('DOMContentLoaded', function () {
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
            let keyboardWrapperPresent = false;
            let languageArrayPosition = 0;
            let ligatureObject;
            let localeName = '';
            let pageElement = document.getElementsByTagName('body')[0]; // formerly $(this)
            let resizeTimerActive = false;
            let shiftStateObject;
            let storedKeyboardObject = { keyboardFile: '', arrayPosition: '' };
            let textFlowDirection = 'LTR';

            const KEYBOARD_VERSION = '1.1.7';
            const LANGUAGE_KEY_DEFAULT = 'Language';
            const LANGUAGE_MAP_SPLIT_CHAR = ':';
            const TRIGGER_KEYBOARD_FLAG = 'triggerKeyboard';

            const CDN_LANGUAGES_DIRECTORY = `https://cdn.jsdelivr.net/npm/mok-project@${KEYBOARD_VERSION}/dist/languages`;

            // Build out our language list from input string.
            const constructLanguageList = (language) =>
                language.split(',').map(splitLanguage =>
                    splitLanguage.trim());

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
                language = '',
                languageKey = '',
                languageKeyTextColor = '#3498db',
                showSelectedLanguage = false,
                spareKey = '',
                specifiedFieldsOnly = false,
                tabKey = ''
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
                tabKey
            });

            const options = initOptions(passedOptions);

            //*****Define our attributes that we care about.*****
            let inputAttributes = {
                disabled: '',
                readonly: '',
                maxlength: '',
                min: '',
                max: '',
                placeholder: ''
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
                    let targetIsKeyboardElement = false

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
                        inputAttributes[prop] = tempElement[prop] === undefined ? '' : tempElement[prop];
                    };

                    if (!inputAttributes.disabled && !inputAttributes.readonly) {
                        focusedInputField = event.target;
                        keyboardStreamField = focusedInputField;

                        //*****If direct enter enabled, don't bother.*****
                        if (!options.directEnter) {
                            keyboardStreamField = document.getElementsByClassName('keyboard-input-field')[0];
                            if (focusedInputField.tagName === 'INPUT') {
                                inputFieldType = focusedInputField.type;
                                keyboardInputType = inputFieldType === 'password' ? 'password' : 'text';

                                keyboardStreamField.placeholder = inputAttributes.placeholder;
                                keyboardStreamField.value = focusedInputField.value;
                                keyboardStreamField.type = keyboardInputType;
                            } else {
                                inputFieldType = 'text';
                                keyboardStreamField.value = focusedInputField.innerHTML;
                                keyboardStreamField.type = 'text';
                            }
                            document.getElementsByClassName('keyboard-blackout-background')[0].style.display = 'block';
                        }
                        //************************************************

                        document.getElementsByClassName('keyboard-wrapper')[0].style.display = 'block';
                        keyboardOpen = true;
                        keyboardStreamField.focus();
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
                            if (!elementLayer.classList.contains('keyboard-wrapper')) {
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
                }
            }

            document.addEventListener('keypress', hardwareKeypress);


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
                    fetch(`./languages/${file}.klc`)
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

                            var ligatureArr = [];
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
            function materializeKeyboard(keyListString) {
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
                    keyboardWrapperPresent = true;
                } else {
                    document.body.insertAdjacentHTML('afterbegin', '<div class="keyboard-wrapper"></div>');
                    //*****If direct enter enabled, don't bother.*****
                    if (!options.directEnter) {
                        document.body.insertAdjacentHTML('afterbegin', '<div class="keyboard-blackout-background"></div>');
                    }
                    keyboardWrapperPresent = false;
                }

                generateRow(keyMapArray.slice(0, 13));
                generateRow(keyMapArray.slice(13, 26));
                generateRow(keyMapArray.slice(26, 37));
                generateRow(keyMapArray.slice(37, 47));

                setKeys('default');
                keyboardFillout();
                sizeKeys();
                keyboardAttributes();
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
                    keyboardActionWrapper.innerHTML = '<button class="keyboard-action-button keyboard-cancel-button">Cancel</button><input type="text" class="keyboard-input-field"><button class="keyboard-action-button keyboard-accept-button">Accept</button>';
                    keyboardWrapper.insertBefore(keyboardActionWrapper, keyboardWrapper.firstChild);
                }

                const keyboardRows = document.querySelectorAll('.keyboard-row');

                keyboardRows[0].insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="backspace">Backspace</button>');
                keyboardRows[1].insertAdjacentHTML('afterbegin', '<button class="keyboard-key keyboard-key-lg" data-keyval="tab">Tab</button>');
                keyboardRows[2].insertAdjacentHTML('afterbegin', `<button class="keyboard-key keyboard-key-lg caps-lock-key ${options.isPermanentUppercase ? 'caps-lock-key-active' : ''}" data-keyval="caps lock">Caps Lock</button>`);
                keyboardRows[2].insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="enter">Enter</button>');
                keyboardRows[3].insertAdjacentHTML('afterbegin', '<button class="keyboard-key keyboard-key-lg" data-keyval="shift">Shift</button>');
                keyboardRows[3].insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="shift">Shift</button>');

                const newKeyboardRow = document.createElement('div');
                newKeyboardRow.className = 'keyboard-row';

                newKeyboardRow.insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="ctrl">Ctrl</button>');
                newKeyboardRow.insertAdjacentHTML('beforeend', `<button class="keyboard-key keyboard-key-lg language-button" data-keyval="language">
    <span style="color: ${languageKeyTextColor};" data-keyval="language">${languageButtonText}</span>
  </button>`);
                newKeyboardRow.insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="alt">Alt</button>');
                newKeyboardRow.insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-xl" data-keyval="space">&nbsp;</button>');
                newKeyboardRow.insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="alt grp">Alt Grp</button>');
                newKeyboardRow.insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="spare">&nbsp;</button>');
                newKeyboardRow.insertAdjacentHTML('beforeend', '<button class="keyboard-key keyboard-key-lg" data-keyval="ctrl">Ctrl</button>');

                document.querySelector('.keyboard-wrapper').appendChild(newKeyboardRow);
            }


            //***********************************************************************************
            //*              Adjust sizing of keys based on our enabled options.                *
            //***********************************************************************************
            function sizeKeys() {
                const keyboardRows = document.querySelectorAll('.keyboard-row');
                const keyPadding = 2 * parseInt(getComputedStyle(document.querySelector('.keyboard-key')).marginRight.match(/[0-9]/), 10);
                const maxKeyCount = 15;

                for (let prop in keyboardRows) {
                    if ('object' !== typeof keyboardRows[prop]) {
                        continue
                    }
                    let rowWidth, smallKeys, largeKeys, xlargeKeys
                    try {
                        rowWidth = keyboardRows[prop].offsetWidth;
                        smallKeys = keyboardRows[prop].querySelectorAll('.keyboard-key-sm').length;
                        largeKeys = keyboardRows[prop].querySelectorAll('.keyboard-key-lg').length;
                        xlargeKeys = keyboardRows[prop].querySelectorAll('.keyboard-key-xl').length;
                    } catch (error) {
                        console.error(error)
                    }
                    const smallKeyWidth = (rowWidth - (maxKeyCount * keyPadding)) / maxKeyCount;
                    const largeKeyWidth = (rowWidth - ((smallKeys + largeKeys + xlargeKeys) * keyPadding) - (smallKeys * smallKeyWidth) - (xlargeKeys * (rowWidth / 3))) / largeKeys;
                    const xlargeKeyWidth = rowWidth / 3;

                    let keyboardKeySm = keyboardRows[prop].querySelectorAll('.keyboard-key-sm')
                    for (let propSm in keyboardKeySm) {
                        try {
                            keyboardKeySm[propSm].style.width = `${smallKeyWidth}px`;
                        } catch (error) { }
                    };
                    let keyboardKeyLg = keyboardRows[prop].querySelectorAll('.keyboard-key-lg')
                    for (let propLg in keyboardKeyLg) {
                        try {
                            keyboardKeyLg[propLg].style.width = `${largeKeyWidth}px`;
                        } catch (error) { }
                    };
                    let keyboardKeyXl = keyboardRows[prop].querySelectorAll('.keyboard-key-xl')
                    for (let propXl in keyboardKeyXl) {
                        try {
                            keyboardKeyXl[propXl].style.width = `${xlargeKeyWidth}px`;
                        } catch (error) { }
                    };
                };
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
                            keyboardStreamField.value = keyboardStreamField.value.slice(0, caretPosition - 1) + keyboardStreamField.value.slice(caretPosition);
                            caretPosition -= 1;
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
                            if (languageArrayPosition + 1 <= options.language.length - 1) {
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
                    if ((inputAttributes.maxlength !== '-1' && inputAttributes.maxlength !== '' && newString.length > inputAttributes.maxlength) || (inputFieldType === 'number' && inputAttributes.max !== '' && inputAttributes.max !== '-1' && (newString * 1) > (inputAttributes.max * 1)) || (inputFieldType === 'number' && inputAttributes.min !== '' && inputAttributes.min !== '-1' && (newString * 1) < (inputAttributes.min * 1)) || keyPressed.search(options.keyCharacterRegex[inputFieldType]) < 0 || newString.search(options.inputFieldRegex[inputFieldType]) < 0) {
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
            }


            //***********************************************************************************
            //*                       Discard keyboard data and close.                          *
            //***********************************************************************************
            function discardData() {
                keyboardStreamField.value = '';
                clearKeyboardState();
                keyboardOpen = false;
                readKeyboardFile();
            }

            //***********************************************************************************
            //*                   Submit keyboard data to form and close.                       *
            //***********************************************************************************
            function acceptData() {
                if (focusedInputField.tagName === 'INPUT') {
                    focusedInputField.value = keyboardStreamField.value;
                } else {
                    focusedInputField.innerHTML = keyboardStreamField.value;
                }
                keyboardStreamField.value = '';
                clearKeyboardState();
                keyboardOpen = false;
                readKeyboardFile();
            }

            //***********************************************************************************
            //*                Provide some styling options for our keyboard.                   *
            //***********************************************************************************
            function keyboardAttributes() {
                let viewportWidth = window.innerWidth,
                    viewportHeight = window.innerHeight,
                    keyboardHeight = document.querySelector('.keyboard-wrapper').offsetHeight,
                    keyboardWidth = document.querySelector('.keyboard-wrapper').offsetWidth;

                let keyboardKeys = document.querySelectorAll('.keyboard-key');
                for (prop in keyboardKeys) {
                    try {
                        keyboardKeys[prop].style.backgroundColor = options.keyColor;
                        keyboardKeys[prop].style.color = options.keyTextColor;
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
                        document.querySelector('.keyboard-wrapper').style.top = `${(viewportHeight - keyboardHeight) / 2}px`;
                        break;
                    default:
                        document.querySelector('.keyboard-wrapper').style.bottom = '20px';
                }
                document.querySelector('.keyboard-wrapper').style.left = `${(viewportWidth - keyboardWidth) / 2}px`;
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

        document.keyboard = keyboard

        document.dispatchEvent(new CustomEvent('import_done', { detail: { file: getRelativeFilePath(__filename) } }))
    })
})(document)