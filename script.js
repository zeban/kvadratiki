
let currentUserLevel = 0; // Default starting level, can be changed based on user's progress


// === Настройки Firebase ===
const firebaseConfig = {
    apiKey: "FIREBASE_API_KEY", 
    authDomain: "kletkun.firebaseapp.com",
    databaseURL: "https://kletkun-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "kletkun",
    storageBucket: "kletkun.appspot.com",
    messagingSenderId: "87165226423",
    appId: "1:87165226423:web:d89537da74d5727bd06c32",
    measurementId: "G-NY69P4GDB4"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// === Настройки игры ===
const cellsCount = 150;
const totalCells = cellsCount * cellsCount;
const levelNumberElement = document.getElementById("levelNumber");

function updateLevelDisplay() {
   // levelNumberElement.textContent = currentLevel;
}
const userLevels = {}; // Объект для отслеживания активного уровня для каждого пользователя
const initialLevelId = 0;
let [_, gameId, levelId] = window.location.hash.split('/');
if (levelId !== undefined) {
  currentLevel = levelId;
} else {
  currentLevel = initialLevelId.toString();
}
if (!levelId) {
  levelId = initialLevelId.toString(); // Установка начального уровня как строки
}

let drawingChanged = false;


let currentBoardState = {};
if (!gameId || gameId === 'play') {
  gameId = Date.now().toString();
}

if (!levelId) {
  levelId = initialLevelId.toString();  // default value for the initial level
}

window.location.hash = "#/" + gameId + "/" + levelId;

let wasTaskCompleted = false;


let currentTask = null;
if (!currentTask) {
    currentTask = {
        coordinates: []
    };
}
let allCells = [];
let allLevels = [];
firebase.database().ref('levels').on('value', snapshot => {
    allLevels = snapshot.val() || [];
    console.log("Загруженные уровни:", allLevels);
  allLevels.forEach(levelId => {
      if (typeof levelId === 'string' || typeof levelId === 'number') {
          console.log("Инициализация уровня:", levelId);
          initializeLevelInGame(levelId);
      } else {
         
      }
  });
});
loadAllLevels();

function initializeLevelInGame(levelId) {
  const levelIdStr = String(levelId);
  console.log(`Initializing level: ${levelIdStr}, Type: ${typeof levelIdStr}`);

  if (typeof levelIdStr !== 'string' || levelIdStr === 'undefined') {
      console.error('Invalid levelId:', levelIdStr);
      return; // Не продолжаем, если levelId не корректен
  }

  const levelRef = database.ref(`games/${gameId}/levels/${levelIdStr}`);
    levelRef.once('value').then(snapshot => {
        if (!snapshot.exists()) {
            // Если уровень не существует в игре, добавляем его
            levelRef.set({ /* начальные данные уровня */ });
            console.log(`Уровень ${levelIdStr} добавлен в игру ${gameId}`);
        } else {
            console.log(`Уровень ${levelIdStr} уже существует в игре ${gameId}`);
        }
    });
}


// Получение или генерация userId
let userId = localStorage.getItem('userId');
if (!userId) {
    userId = Date.now().toString();
    localStorage.setItem('userId', userId);
  console.log("UserId:", userId);

}



loadLevel(currentLevel);
// После получения данных из Firebase
allLevels = allLevels.filter(levelId => 
    typeof levelId === 'string' || typeof levelId === 'number'
);
loadDrawingForCurrentGame(currentLevel);


let lastCompletionTime = 0;  // глобальная переменная
database.ref('games/' + gameId + '/completed').on('value', snapshot => {
    const completionTime = snapshot.val();
    // Если есть новое уведомление, показываем конфети
    if (completionTime && completionTime !== lastCompletionTime) {

        lastCompletionTime = completionTime;  // обновляем время последнего уведомления
    }
});



// Функция для генерации координат
function generateCoordinates(count) {
    const coordinates = [];
    for (let i = 0; i < count; i++) {
        if (i < 26) {
            coordinates.push(String.fromCharCode(65 + i));
        } else {
            let firstChar = String.fromCharCode(65 + Math.floor((i) / 26) - 1);
            let secondChar = String.fromCharCode(65 + i % 26);
            coordinates.push(firstChar + secondChar);
        }
    }
    return coordinates;
}
// Инициализация координат
const verticalCoordinates = document.getElementById('vertical-coordinates');
const horizontalCoordinates = document.getElementById('horizontal-coordinates');
const horizontalLabels = generateCoordinates(cellsCount);
for (let i = 0; i < cellsCount; i++) {
    verticalCoordinates.innerHTML += `<div style="flex: 1; display: flex; align-items: center; justify-content: center">${i+1}</div>`;
    horizontalCoordinates.innerHTML += `<div style="flex: 1; display: flex; align-items: center; justify-content: center">${horizontalLabels[i]}</div>`;
}
// Создание игрового поля
const board = document.getElementById('board');
const fragment = document.createDocumentFragment();
for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.index = i;
    allCells.push(cell); // Добавьте эту строку
    fragment.appendChild(cell);
}
board.appendChild(fragment);



// Добавление обработчиков событий для клеток
const cells = board.querySelectorAll('.cell');
cells.forEach(cell => {
    cell.addEventListener('mouseenter', (e) => {
        const cellIndex = parseInt(e.target.dataset.index, 10);
        const row = Math.floor(cellIndex / cellsCount);
        const column = cellIndex % cellsCount;
        const verticalCoordinate = verticalCoordinates.children[row];
        const horizontalCoordinate = horizontalCoordinates.children[column];
        verticalCoordinate.classList.add('highlighted-coordinate');
        horizontalCoordinate.classList.add('highlighted-coordinate');
    });
    cell.addEventListener('mouseleave', () => {
        const highlighted = document.querySelectorAll('.highlighted-coordinate');
        highlighted.forEach(el => el.classList.remove('highlighted-coordinate'));
    });
});

// Обработка кликов по доске
// Обработка кликов по доске
let currentListenerRef = null;

// Определение функции для установки слушателей Firebase
function setupFirebaseListeners() {
  // Отключаем предыдущий слушатель, если он существует
  if (currentListenerRef) {
    console.log(`[DEBUG] Removing listener for level: ${currentLevel}`);

      currentListenerRef.off('value');
  }

  // Устанавливаем новый слушатель для текущего уровня
  currentListenerRef = database.ref(`games/${gameId}/levels/${currentLevel}/cells`);
  console.log(`[DEBUG] Setting up listener for level: ${currentLevel}`);

  currentListenerRef.on('value', snapshot => {
    console.log(`[DEBUG] Firebase update detected for level ${currentLevel}`);

    const cellsState = snapshot.val();
    if (cellsState) {
      allCells.forEach(cell => {
        const index = cell.dataset.index;
        if (cellsState[index]) {
          cell.classList.add('taken');
        } else {
          cell.classList.remove('taken');
        }
      });
    }
     displayCoordinates();
  });
 
}
// Обработка кликов по доске

// Функция для обработки кликов по ячейкам
// Функция для обработки кликов по ячейкам
let hasFlashed = false; // Флаг для отслеживания первого мигания
let userClicks = []; // Теперь это массив для хранения индексов

async function handleCellClick(cell) {
    const index = cell.dataset.index;
    const cellRef = database.ref(`games/${gameId}/levels/${currentLevel}/cells/${index}`);

    let wasTaskCompletedBeforeClick = isTaskCompleted;

    await cellRef.transaction(currentState => {
        return (currentState === true) ? null : true;
    });

    let taskJustCompleted = checkTaskCompletion();
    if (taskJustCompleted && !wasTaskCompletedBeforeClick) {
        showConfetti();
        markLevelAsCompleted();
        checkLevelCompletion();
        notifyCompletionToOthers();
    } else if (!taskJustCompleted) {
        database.ref('games/' + gameId + '/completed').remove();
    }

    if (botEnabled) {
        processBotLogic(index);
    }
}

// Асинхронная функция для обработки логики ботов
async function processBotLogic(lastUserClickIndex) {
    userClicks.push(lastUserClickIndex);
    if (!botTimer) {
        botTimer = setTimeout(() => {
            let botClickCount = userClicks.length * 2;
            botMove(botClickCount, parseInt(userClicks[userClicks.length - 1], 10));
            botTimer = null;
            userClicks = [];
        }, 2000);
    }
}

// Функция для обновления DOM после клика по клетке
function updateDomAfterCellClick() {
    // Ваш код для обновления DOM
}



function flashCompletedCells() {
    // Добавляем класс 'red-flash' ко всем клеткам задания
    currentTask.coordinates.forEach(coord => {
        const [letter, number] = splitCoordinate(coord);
        const cellIndex = getCellIndex(letter, number);
        const cell = board.querySelector(`[data-index="${cellIndex}"]`);
        if (cell) {
            cell.classList.add('red-flash');
        }
    });

    // Удаляем класс 'red-flash' и подсвечиваем кнопку следующего уровня через 1 секунду
    setTimeout(() => {
        currentTask.coordinates.forEach(coord => {
            const [letter, number] = splitCoordinate(coord);
            const cellIndex = getCellIndex(letter, number);
            const cell = board.querySelector(`[data-index="${cellIndex}"]`);
            if (cell) {
                cell.classList.remove('red-flash');
            }
        });
        hasFlashed = false; // Сброс флага после завершения мигания

        // Подсвечиваем кнопку следующего уровня
        highlightNextLevelButton();
    }, 2000);
}

function highlightNextLevelButton() {
    const nextLevelButton = document.getElementById('nextLevel');
    // Первое мигание
    nextLevelButton.classList.add('highlight-next-level');

    setTimeout(() => {
        nextLevelButton.classList.remove('highlight-next-level');
        // Второе мигание после короткой паузы
        setTimeout(() => {
            nextLevelButton.classList.add('highlight-next-level');

            setTimeout(() => {
                nextLevelButton.classList.remove('highlight-next-level');
            }, 500); // 500 мс для мигания
        }, 500); // 500 мс пауза перед вторым миганием
    }, 500); // 500 мс для первого мигания
}


// Добавление слушателя кликов по доске
board.addEventListener('click', function(e) {
  if (e.target.classList.contains('cell')) {
    handleCellClick(e.target);
  }
});

// Вызываем функцию для установки слушателей при загрузке страницы
setupFirebaseListeners();






//Отмечаем выполненные координаты
let currentCoordIndex = 0; // Глобальный индекс для текущей координаты

let isTaskCompleted = false; // Начальное состояние завершенности задания

function checkTaskCompletion() {
    if (drawingChanged) return false;
    let allCoordsCompleted = true;
    let foundUnhighlighted = false;

    currentTask.coordinates.forEach((coord, index) => {
        const [letter, number] = splitCoordinate(coord);
        const cellIndex = getCellIndex(letter, number);
        const cell = board.querySelector(`[data-index="${cellIndex}"]`);
        const coordElement = taskCoordinates.children[index];

        if (coordElement) {
            if (cell.classList.contains('taken')) {
                coordElement.classList.add('highlighted');
                coordElement.classList.remove('bhighlighted');
                coordElement.style.display = 'none';
            } else {
                coordElement.classList.remove('highlighted');
                coordElement.classList.add('bhighlighted');
                allCoordsCompleted = false;
                if (!foundUnhighlighted) {
                    currentCoordIndex = index;
                    foundUnhighlighted = true;
                }
                coordElement.style.display = index === currentCoordIndex ? '' : 'none';
            }
        }
    });

    if (!foundUnhighlighted) {
        currentCoordIndex = 0;
    }

    if (allCoordsCompleted && !isTaskCompleted) {
        flashCompletedCells();
        isTaskCompleted = true;
        // Показываем конфетти только при первом завершении
        showConfetti(); 
    } else if (!allCoordsCompleted && isTaskCompleted) {
        isTaskCompleted = false;
    }

    return allCoordsCompleted;
}


function splitCoordinate(coord) {
    const letter = coord.match(/[A-Z]+/)[0];
    const number = parseInt(coord.match(/\d+/)[0], 10);
    return [letter, number];
    // === Для диагностики ===
    console.log(splitCoordinate('D1')); // Должно вывести: ['D', '1']
}
function getCellIndex(letter, number) {
    const columnIndex = horizontalLabels.indexOf(letter);
    return (number - 1) * cellsCount + columnIndex;
    // === Для диагностики ===
    console.log(getCellIndex('D', 1)); // Должно вывести индекс клетки для координаты D1
}
// Обработка обновлений клеток
function handleCellUpdate(snapshot) {
    const cellIndex = snapshot.key;
    const cellOwner = snapshot.val();
    const cell = board.querySelector(`[data-index="${cellIndex}"]`);
    if (cellOwner) {
        if (!cell.classList.contains('taken')) {
            cell.classList.add('taken');
            cell.dataset.owner = cellOwner;
        }
    } else {
        if (cell.classList.contains('taken')) {
            cell.classList.remove('taken');
            delete cell.dataset.owner;
        }
    }
}

// слушатель конфетти для всех
let lastCelebratedCompletion = 0;
database.ref('games/' + gameId + '/completed').on('value', (snapshot) => {
  console.log("Listener for 'completed' triggered");

    const completionTime = snapshot.val();
    if (completionTime && completionTime > lastCelebratedCompletion) {
        showConfetti();
        lastCelebratedCompletion = completionTime;
    }
});
database.ref(`games/${gameId}/levels/${currentLevel}/drawing`).on('child_changed', handleCellUpdate);
database.ref(`games/${gameId}/levels/${currentLevel}/drawing`).on('child_added', handleCellUpdate);
database.ref(`games/${gameId}/levels/${currentLevel}/drawing`).on('child_removed', (snapshot) => {
    const cellIndex = snapshot.key;
    const cell = board.querySelector(`[data-index="${cellIndex}"]`);
    cell.classList.remove('taken');
    delete cell.dataset.owner;
});

// Обработка кнопок "Поделиться" и "Новая игра"
const shareButton = document.getElementById('shareButton');
shareButton.addEventListener('click', function() {
    ym(95445197,'reachGoal','shareButton')

    if (navigator.share) {
        navigator.share({
            title: 'Поделитесь игрой!',
            url: window.location.href
        }).then(() => {
            console.log('Успешно поделились!');
        }).catch((error) => {
            console.log('Ошибка при попытке поделиться:', error);
        });
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = window.location.href;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        shareButton.innerText = "Ссылка скопирована";
        setTimeout(() => {
            shareButton.innerText = "Поделиться";
        }, 2000);
    }
});


document.getElementById('newGameButton').addEventListener('click', function(e) {
       ym(95445197,'reachGoal','newgame')

    const newGameId = Date.now().toString();
    const newLevelId = "0"; // Устанавливаем ID уровня на 0 для новой игры
    const newGameUrl = window.location.origin + window.location.pathname + '#/' + newGameId + '/' + newLevelId;

    // Открываем новую игру в новой вкладке
    window.open(newGameUrl, '_blank');
});



// З А Д А Н И Я
// рисунок
// Переменная для хранения текущего уровня



// Кофетти
let lastCelebrationTime = 0;
const CELEBRATION_INTERVAL = 10000; // 10 секунд
function showConfetti() {
    const currentTime = Date.now();
    if (currentTime - lastCelebrationTime > CELEBRATION_INTERVAL) {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
        lastCelebrationTime = currentTime;
    }
}

function markLevelAsCompleted() {
    database.ref('games/' + gameId + '/completedLevels/' + currentLevel).once('value').then(snapshot => {
        if (!snapshot.val()) {
            database.ref('games/' + gameId + '/completedLevels/' + currentLevel).set(true);

        }
    });
}




//Конфетти у всех
function notifyCompletionToOthers() {
    // Записываем в Firebase текущее время
    database.ref('games/' + gameId + '/completed').set(Date.now());
}

//ЗАгружаем уровни

function clearTaskPanel() {
    const taskCoordinates = document.getElementById("taskCoordinates"); // Предполагаемый ID панели задач
    // Очистка содержимого панели задач
    taskCoordinates.innerHTML = ''; // Или любой другой способ очистки, который вы используете
}



console.log("Starting to load level");
async function loadLevel(levelId) {
    drawingChanged = false;
    console.log("Function loadLevel is called with level:", levelId);

    // Очищаем текущую доску
    clearBoard();
  clearTaskPanel(); // Очищаем панель задач перед загрузкой нового уровня
  currentTask = { coordinates: [] }; // Сброс currentTask


    // Загружаем рисунок для текущего уровня
    loadDrawingForCurrentLevel();

    // Загружаем задание для текущего уровня
    await database.ref('levels/' + levelId).once('value').then(snapshot => {
        console.log("Data loaded for level", levelId, ":", snapshot.val());
        const levelData = snapshot.val();
        if (levelData && levelData.task) {
            currentTask = levelData.task;
           shuffleArray(currentTask.coordinates);
            updateTaskPanel();   // <-- Обновляем панель заданий
            console.log('Загруженные данные уровня:', currentTask);

            // Вызываем функцию для обновления текущего уровня пользователя
          console.log("Type of currentLevel:", typeof currentLevel);


        } else {
            console.error('Ошибка: данные уровня не содержат задания.');
        }
    }).catch(error => {
        console.error("Ошибка при загрузке уровня:", error);
    });
}

console.log("Finished loading level");
function updateTaskPanel() {
    drawingChanged = false;
  if (currentTask && currentTask.coordinates && currentTask.coordinates.length > 0) {
      displayCoordinates();
  }
}



console.log("Type of currentLevel:", typeof currentLevel);



// Кнопульки
// Кнопки
const prevLevelButton = document.getElementById('prevLevel');
const nextLevelButton = document.getElementById('nextLevel');
prevLevelButton.addEventListener('click', () => {
    		ym(95445197, 'reachGoal', 'prevLevelClick');

    console.log(`[DEBUG] prevLevelButton clicked. Current level: ${currentLevel}`);
    console.log(`[DEBUG] allLevels: ${allLevels.join(", ")}`);
    let currentIndex = allLevels.indexOf(currentLevel);
    console.log(`[DEBUG] currentIndex: ${currentIndex}`);
    currentLevel = currentIndex > 0 ? allLevels[currentIndex - 1] : allLevels[allLevels.length - 1];
    console.log(`[DEBUG] New current level: ${currentLevel}`);

    loadLevel(currentLevel);
    setupFirebaseListeners();
    updateLevelDisplay();
    window.location.hash = `#/${gameId}/${currentLevel}`;
});

window.addEventListener('hashchange', function() {
    console.log(`[DEBUG] Hash changed: ${window.location.hash}`);
}, false);

nextLevelButton.addEventListener('click', () => {
    		ym(95445197, 'reachGoal', 'nextLevelClick');

    // Гарантируем, что все элементы в allLevels являются строками
    let stringifiedLevels = allLevels.map(String);

    // Текущий уровень также преобразуем в строку
    let currentLevelStr = String(currentLevel);
    let currentIndex = stringifiedLevels.indexOf(currentLevelStr);

    console.log(`[DEBUG] nextLevelButton clicked. Текущий индекс: ${currentIndex}, Текущий уровень: ${currentLevelStr}`);

    // Переключаемся на следующий уровень
    currentIndex = (currentIndex + 1) % stringifiedLevels.length;
    currentLevel = stringifiedLevels[currentIndex];

    console.log(`[DEBUG] Новый текущий индекс: ${currentIndex}, Новый текущий уровень: ${currentLevel}`);
    loadLevel(currentLevel);
    setupFirebaseListeners();
    updateLevelDisplay();
    window.location.hash = `#/${gameId}/${currentLevel}`;
});



function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}




function displayCoordinates() {
    taskCoordinates.innerHTML = '';
    currentTask.coordinates.forEach(coord => {
        const coordElement = document.createElement('div');
        coordElement.textContent = coord;
        taskCoordinates.appendChild(coordElement);
    });
    checkTaskCompletion();
}


copyCellsToGame(levelId);
async function loadDrawingForCurrentGame(levelId) {
    console.log("Загрузка рисунка для текущей игры началась");
    console.log("loadDrawingForCurrentGame вызвана с levelId:", levelId);

    if (levelId !== undefined && levelId !== null) {
        const levelRef = database.ref('games/' + gameId + '/levels/' + levelId + '/cells');

        try {
            console.log("Попытка получения данных из Firebase...");
            const snapshot = await levelRef.once('value');
            const cells = snapshot.val();

            if (cells && Object.keys(cells).length > 0) {
                // Если уровень имеет предзаполненные данные, отобразим их
                console.log(`Загружен рисунок для уровня ${levelId}:`, cells);
               // displayBoard(cells);
            } else {
                console.log(`Для уровня ${levelId} нет предзаполненных данных.`);
                clearBoard();  // Добавьте эту строку
            }

            console.log("Загрузка рисунка для текущей игры завершилась");
        } catch (error) {
            console.error("Ошибка при загрузке рисунка:", error);
        }
    } else {
        console.log("Уровень не определен, рисунок не будет загружен.");
    }
}





function displayBoard(cells) {
    console.log("Запуск функции displayBoard с данными:", cells);

    const allCells = document.querySelectorAll('.cell');
    let takenCount = 0;  // счетчик для ячеек с состоянием "taken"

    allCells.forEach(cell => {
        const index = cell.dataset.index;
        const isTakenInNewState = cells[index];  // новое состояние ячейки
        const isTakenCurrently = cell.classList.contains('taken');  // текущее состояние ячейки

        if (isTakenInNewState !== isTakenCurrently) {  // если состояния различны
            if (isTakenInNewState) {
                cell.classList.add('taken');
                takenCount++;
            } else {
                cell.classList.remove('taken');
            }
        } else if (isTakenInNewState) {
            takenCount++;  // если состояния совпадают и ячейка "taken", увеличиваем счетчик
        }
    });

    currentBoardState = cells;
    console.log(`Завершение функции displayBoard. Обработано ячеек: ${allCells.length}. Из них taken: ${takenCount}`);
}








function clearBoard() {
    console.log("Очищаем доску");
    const allCells = document.querySelectorAll('.cell');
    allCells.forEach(cell => {
        cell.className = 'cell'; // это сбросит все классы ячейки к 'cell'
    });
}



async function loadDrawingForCurrentLevel() {
    const levelId = currentLevel;
    const levelRef = database.ref(`games/${gameId}/levels/${levelId}/cells`);

    try {
        // Сначала попытаемся скопировать данные
        await copyCellsToGame(levelId);

        // Затем попытаемся загрузить рисунок
        const cells = await levelRef.once('value').then(snapshot => snapshot.val());

        console.log(`Загружен рисунок для уровня ${levelId}:`, cells);

        if (cells) {
            displayBoard(cells);
            updateTaskPanel();
        }

        // Отправляем изменения в реальном времени в Firebase Realtime Database
    } catch (error) {
        console.error("Ошибка при загрузке рисунка для уровня:", error);
    }
}


updateLevelDisplay();

let attempts = 0;
const maxAttempts = 10;


// Дозагрузк
const intervalId = setInterval(() => {
    if (currentTask && currentTask.coordinates && currentTask.coordinates.length > 0) {
        updateTaskPanel();
        clearInterval(intervalId);  // Остановите интервал, когда данные загружены
    } else if (attempts >= maxAttempts) {
        clearInterval(intervalId);  // Остановите интервал после 10 попыток
    }
    attempts++;
}, 2000);  // Проверка каждую секунду


// З У М И Л К А
const zoomToggle = document.getElementById('zoomToggle');
const boardContainer = document.getElementById('board-container');
const zoomIcon = document.getElementById('zoomIcon');
let isZoomedIn = true;

zoomToggle.addEventListener('click', function() {
    if (!isZoomedIn) {
        // Логика увеличения масштаба
        board.classList.add('zoomed-in');
        board.classList.remove('zoomed-out');
        boardContainer.classList.add('zoomed-in');
        boardContainer.classList.remove('zoomed-out');
        document.documentElement.style.setProperty('--cell-size', window.innerWidth < 768 ? '8vw' : '2.5vw');
        document.getElementById('board-container').style.height = board.scrollHeight + "px";
        verticalCoordinates.style.display = 'grid';
        horizontalCoordinates.style.display = 'grid';

        // Обновление SVG для индикации "уменьшить масштаб"
        zoomIcon.innerHTML = '<path fill-rule="evenodd" clip-rule="evenodd" d="M11 0V4V6H13H17V4H13V0H11ZM6 13V17H4L4 13L0 13V11H4H6L6 13Z" fill="black"/>';

        isZoomedIn = true;
    } else {
        // Логика уменьшения масштаба
        board.classList.remove('zoomed-in');
        board.classList.add('zoomed-out');
        boardContainer.classList.remove('zoomed-in');
        boardContainer.classList.add('zoomed-out');
        document.documentElement.style.setProperty('--cell-size', '0.67vw');
        document.getElementById('board-container').style.height = 'auto';
        verticalCoordinates.style.display = 'none';
        horizontalCoordinates.style.display = 'none';

        // Обновление SVG для индикации "увеличить масштаб"
        zoomIcon.innerHTML = '<path fill-rule="evenodd" clip-rule="evenodd" d="M15 0H11V2L15 2L15 6L17 6V2V0H15ZM0 15V11H2L2 15L6 15L6 17H2L0 17V15Z" fill="black"/>';

        isZoomedIn = false;
    }
});

//ZOOM НА ТЕЛЕФОНЕ

//конец зума на телеоне



function checkLevelCompletion() {
   console.log("checkLevelCompletion called");
    // Проверяем завершенность текущего уровня
    database.ref('games/' + gameId + '/completedLevels/' + currentLevel).once('value').then(snapshot => {


    });
}



async function copyCellsToGame(levelId) {
    console.log("Начало копирования ячеек с levelId:", levelId);

    const sourceRef = database.ref('levels/' + levelId + '/cellsState');
    const destinationRef = database.ref('games/' + gameId + '/levels/' + levelId + '/cells');

    // Проверяем, существуют ли уже данные в destinationRef
    const existingData = await destinationRef.once('value').then(snap => snap.val());
    if (existingData) {
        console.log("Данные уже существуют, пропускаем копирование.");
        return; // Если данные уже существуют, завершаем функцию
    }

    try {
        const snapshot = await sourceRef.once('value');
        const cellsState = snapshot.val();

        if (!cellsState) {
            console.warn(`Предзаполненные данные для уровня ${levelId} отсутствуют. Продолжаем без копирования.`);
            return;
        }

        let cellsIndexes = {};

        for (let coord in cellsState) {
            const [letter, number] = splitCoordinate(coord);
            const index = getCellIndex(letter, number);
            cellsIndexes[index] = true;
        }

        await destinationRef.set(cellsIndexes);
        console.log("Ячейки успешно скопированы!");

    } catch (error) {
        console.error("Ошибка при копировании ячеек:", error);
    }
}


 //   B B B B B B B O O O O O O O O O O T T T T T T T T T T
let botEnabled = false;
let botTimer = null;



function toggleBot() {
  botEnabled = !botEnabled;

  const botIconActive = document.getElementById('botIconActive');
  const botIconInactive = document.getElementById('botIconInactive');

  if (botEnabled) {
      botIconActive.style.display = 'block';
      botIconInactive.style.display = 'none';
  } else {
      botIconActive.style.display = 'none';
      botIconInactive.style.display = 'block';
  }

  console.log(`Бот ${botEnabled ? 'включен' : 'выключен'}.`);
}

document.getElementById('botToggle').addEventListener('click', toggleBot);


// Вспомогательная функция для выбора нового направления


// Функция для определения следующего направления поворота по часовой стрелке
function getNextClockwiseDirection(direction) {
    const directions = ['up', 'right', 'down', 'left'];
    let index = directions.indexOf(direction);
    return directions[(index + 1) % directions.length];
}

// Функция для определения следующего направления поворота против часовой стрелки
function getNextCounterClockwiseDirection(direction) {
    const directions = ['up', 'left', 'down', 'right'];
    let index = directions.indexOf(direction);
    return directions[(index + 1) % directions.length];
}

function makeSingleBotMove(clicksLeft, currentRow, currentColumn, direction, rotateClockwise) {
    if (clicksLeft <= 0) {
        console.log('Бот завершил ходы');
        return;
    }

    let nextRow = currentRow;
    let nextColumn = currentColumn;

    // Проверяем, можно ли продолжить движение в текущем направлении
    if (isDirectionValid(currentRow, currentColumn, direction, cellsCount, allCells)) {
        nextRow += direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
        nextColumn += direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
    } else {
        // Выбираем новое направление, если текущее заблокировано
        direction = rotateClockwise ? getNextClockwiseDirection(direction) : getNextCounterClockwiseDirection(direction);
    }

    // Случайно решаем, поворачивать ли боту на этом ходу
    if (Math.random() < 0.4) { // 30% шанс поворота на каждом ходу
        direction = rotateClockwise ? getNextClockwiseDirection(direction) : getNextCounterClockwiseDirection(direction);
    }

    // Выполняем ход
    let nextCellIndex = nextRow * cellsCount + nextColumn;
    let cellToTake = allCells[nextCellIndex];
    if (!cellToTake.classList.contains('taken') && nextRow >= 0 && nextRow < cellsCount && nextColumn >= 0 && nextColumn < cellsCount) {
        cellToTake.classList.add('taken');
        cellToTake.dataset.owner = 'bot';
        const cellRef = database.ref(`games/${gameId}/levels/${currentLevel}/cells/${nextCellIndex}`);
        cellRef.set(true);
        console.log('Бот сделал ход в клетку:', nextCellIndex);
    } else {
        console.log('Клетка занята или за пределами доски, бот пропускает ход.');
    }

    // Планируем следующий ход
    setTimeout(() => {
        makeSingleBotMove(clicksLeft - 1, nextRow, nextColumn, direction, rotateClockwise);
    }, 100);
}

// Здесь мы запускаем движение бота, предварительно выбрав, будет ли он поворачивать по часовой стрелке или нет
function botMove(botClickCount, lastUserClickIndex) {
    let rotateClockwise = Math.random() < 0.9; // 50% шанс поворачивать по часовой стрелке

    // Начальные координаты для бота - последняя клетка, кликнутая пользователем
    let initialRow = Math.floor(lastUserClickIndex / cellsCount);
    let initialColumn = lastUserClickIndex % cellsCount;
    let currentDirection = chooseRandomDirection();

    makeSingleBotMove(botClickCount, initialRow, initialColumn, currentDirection, rotateClockwise);
}
// Случайно выбираем начальное направление
function chooseRandomDirection() {
    const directions = ['up', 'down', 'left', 'right'];
    let randomIndex = Math.floor(Math.random() * directions.length);
    return directions[randomIndex];
}

// Вспомогательная функция для случайного выбора направления


function isDirectionValid(row, column, direction, cellsCount, allCells) {
  // Убедимся, что direction — это допустимое направление
    if (!['up', 'down', 'left', 'right'].includes(direction)) {
        console.error('Недопустимое направление:', direction);
        return false;
    }

    // Проверьте, что row и column — это числа
    if (typeof row !== 'number' || typeof column !== 'number') {
        console.error('row или column не являются числами');
        return false;
    }

    // Убедимся, что cellsCount — это число
    if (typeof cellsCount !== 'number') {
        console.error('cellsCount не является числом');
        return false;
    }
    // Получаем следующую позицию в зависимости от направления
    let dRow = (direction === 'up') ? -1 : (direction === 'down') ? 1 : 0;
    let dColumn = (direction === 'left') ? -1 : (direction === 'right') ? 1 : 0;
    let nextRow = row + dRow;
    let nextColumn = column + dColumn;

    // Проверяем, не выходит ли следующая клетка за пределы доски
    if (nextRow < 0 || nextRow >= cellsCount || nextColumn < 0 || nextColumn >= cellsCount) {
        return false;
    }

    // Индекс следующей клетки на доске
    let nextIndex = nextRow * cellsCount + nextColumn;

    // Проверяем, не занята ли следующая клетка
    if (allCells[nextIndex].classList.contains('taken')) {
        return false;
    }

    // Дополнительная проверка, чтобы избежать создания квадрата из четырёх клеток
    if (willCreateSquare(nextRow, nextColumn, cellsCount, allCells)) {
        return false;
    }

    return true; // Направление валидно для хода
}

function willCreateSquare(row, column, cellsCount, allCells) {
    const directions = [
        { dRow: -1, dColumn: 0 },  // Проверка вверх
        { dRow: 1, dColumn: 0 },   // Проверка вниз
        { dRow: 0, dColumn: -1 },  // Проверка влево
        { dRow: 0, dColumn: 1 }    // Проверка вправо
    ];

    let takenCount = 0;

    // Проверяем клетки по всем четырём направлениям от текущей
    for (let i = 0; i < directions.length; i++) {
        let newRow = row + directions[i].dRow;
        let newColumn = column + directions[i].dColumn;
        let newIdx = newRow * cellsCount + newColumn;

        if (newRow >= 0 && newRow < cellsCount && newColumn >= 0 && newColumn < cellsCount && allCells[newIdx].classList.contains('taken')) {
            takenCount++;
        }

        if (takenCount > 1) {  // Если нашли более одной занятой клетки вокруг, есть риск создания квадрата
            return true;
        }
    }

    return false;
}


// Изменяем функцию makeBotMove, чтобы она принимала направление движения как параметр


// Функция для получения индекса последней кликнутой пользователем клетки


document.getElementById('newBoardButton').addEventListener('click', createNewUserLevel);



function createNewUserLevel() {
    // Генерируем случайную строку из трех букв
    const randomString = Array(3).fill(null).map(() => String.fromCharCode(Math.floor(Math.random() * 26) + 97)).join('') + 'un';

    // Генерируем уникальный идентификатор уровня
    const newUserLevelId = randomString + '(' + new Date().toISOString().slice(0, 10) + ')';

    const newLevelData = {}; // Пустой объект для нового уровня
    const path = `games/${gameId}/levels/${newUserLevelId}`;

    console.log("Попытка создать новый уровень. Path:", path); // Логирование перед запросом

    database.ref(path).set(newLevelData).then(() => {
        console.log("Уровень успешно создан:", newUserLevelId, "Path:", path);

        allLevels.push(newUserLevelId); // Добавляем новый уровень в общий список
        currentLevel = newUserLevelId; // Обновляем только текущий уровень

        loadLevel(currentLevel); // Загружаем новый уровень
        setupFirebaseListeners();
        updateLevelDisplay(); // Обновляем отображение уровня

        // Важно: обновляем хэш URL для отражения нового уровня
        window.location.hash = `#/${gameId}/${newUserLevelId}`;
    }).catch(error => {
        console.error("Ошибка создания нового уровня:", error);
    });
}

// B B B B  O  O O O O T T T T E E E E N N N D D D D D D 

function loadAllLevels() {
    // Загружаем стандартные уровни
    database.ref('levels').once('value').then(snapshot => {
        const levelsData = snapshot.val();
        let standardLevels = levelsData ? Object.keys(levelsData).map(String) : [];

        // Загружаем пользовательские уровни
        return database.ref(`games/${gameId}/levels`).once('value').then(snapshot => {
            const gameLevelsData = snapshot.val();
            let gameLevels = gameLevelsData ? Object.keys(gameLevelsData) : [];

            // Объединяем списки, удаляем дубликаты
            allLevels = [...new Set([...standardLevels, ...gameLevels])];
            console.log("Загружены уровни:", allLevels);
        });
    }).catch(error => {
        console.error("Ошибка при загрузке уровней:", error);
    });
}



// D R A W 
let isDrawing = false;
let lastCell = null; // Для отслеживания последней активированной клетки

function initializeDrawingHandlers() {
    const board = document.getElementById('board');
    board.addEventListener('mousedown', () => { isDrawing = true; });
    board.addEventListener('mousemove', handleMouseMove);
    board.addEventListener('mouseup', handleMouseUp);
    board.addEventListener('mouseleave', () => { isDrawing = false; });
}

function handleMouseMove(event) {
    if (isDrawing && event.target.classList.contains('cell')) {
        if (event.target !== lastCell) {
            lastCell = event.target;
            toggleCellState(event.target); // Меняем состояние клетки при движении
        }
    }
}

function handleMouseUp(event) {
    if (event.target.classList.contains('cell') && event.target === lastCell) {
        toggleCellState(event.target); // Меняем состояние клетки при клике
    }
    isDrawing = false;
    lastCell = null;
}

function toggleCellState(cell) {
    const index = cell.dataset.index;
    const cellRef = database.ref(`games/${gameId}/levels/${currentLevel}/cells/${index}`);

    cellRef.once('value').then((snapshot) => {
        const isTaken = snapshot.val();
        if (isTaken) {
            cell.classList.remove('taken');
            cellRef.remove();
        } else {
            cell.classList.add('taken');
            cellRef.set(true);
        }
    });
}

initializeDrawingHandlers();

// z o o 
const zoomableDiv = document.getElementById('zoomableDiv');
let scale = 1;
let initialDistance;

function getDistance(touch1, touch2) {
    const dx = touch1.pageX - touch2.pageX;
    const dy = touch1.pageY - touch2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
}

zoomableDiv.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        e.preventDefault();
        initialDistance = getDistance(e.touches[0], e.touches[1]);
    }
});

zoomableDiv.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        if (initialDistance) {
            scale = (currentDistance / initialDistance) * scale;
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const newWidth = screenWidth / scale; // Новая ширина элемента
            const newHeight = screenHeight / scale; // Новая высота элемента

            zoomableDiv.style.transform = `scale(${scale})`;
            zoomableDiv.style.width = `${newWidth}px`; // Обновление ширины элемента
            zoomableDiv.style.height = `${newHeight}px`; // Обновление высоты элемента
            initialDistance = currentDistance; // Обновляем начальное расстояние для следующего жеста
        }
    }
});

zoomableDiv.addEventListener('touchend', () => {
    if (e.touches.length < 2) {
        scale = parseFloat(zoomableDiv.style.transform.replace('scale(', '').replace(')', '')) || 1;
    }
});

