    
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
    levelNumberElement.textContent = currentLevel;
}
const userLevels = {}; // Объект для отслеживания активного уровня для каждого пользователя
const initialLevelId = 0;
let [_, gameId, levelId] = window.location.hash.split('/');
if (levelId !== undefined) {
  currentLevel = parseInt(levelId, 10);
} else {
  // Если в URL нет levelId, устанавливаем начальный уровень (если это необходимо)
  currentLevel = 0;
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



let currentTask = null;
if (!currentTask) {
    currentTask = {
        coordinates: []
    };
}
let allCells = [];


let maxLevels;
database.ref('levels').once('value').then(snapshot => {
    const levels = snapshot.val();
    maxLevels = Object.keys(levels).length;
    console.log("Total levels available:", maxLevels);
});



// Получение или генерация userId
let userId = localStorage.getItem('userId');
if (!userId) {
    userId = Date.now().toString();
    localStorage.setItem('userId', userId);
  console.log("UserId:", userId);

}



loadLevel(currentLevel);

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
  });
}
// Обработка кликов по доске

// Функция для обработки кликов по ячейкам
// Функция для обработки кликов по ячейкам
let playerMoves = [];
    // Глобальный массив для хранения индексов удаленных клеток
    let removedCells = [];

function handleCellClick(cell, isBotClick = false) {
        console.log('[DEBUG] handleCellClick called');
        drawingChanged = true;
        const index = cell.dataset.index;
        const cellRef = database.ref(`games/${gameId}/levels/${currentLevel}/cells/${index}`);

        // Проверяем текущее состояние клетки в базе данных
        cellRef.once('value').then(snapshot => {
            const isTaken = snapshot.val();
            console.log(`[DEBUG] Cell at index ${index} isTaken: ${isTaken}`);

            // Переключаем состояние ячейки в зависимости от значения isTaken
            if (isTaken) {
                cell.classList.remove('taken');
                cellRef.remove();
                if (!isBotClick) {
                    // Если ход не от бота, добавляем индекс клетки в массив удаленных
                    removedCells.push(parseInt(index));
                }
            } else {
                cell.classList.add('taken');
                cellRef.set(true);
            }

            drawingChanged = false;
            displayCoordinates();

    if (isDrawingJustCompleted()) {
      showConfetti();
      markLevelAsCompleted();
      checkLevelCompletion();
      notifyCompletionToOthers();
    } else if (!isDrawingComplete()) {
      database.ref('games/' + gameId + '/completed').remove();
    }
  });
  // Если клик совершил игрок, обновляем историю его ходов
  if (!isBotClick) {
    // Добавляем индекс текущей клетки в массив playerMoves
    const cellIndex = getCellIndexFromCell(cell);
    playerMoves.push(cellIndex);

    // Если в массиве более двух элементов, удаляем самый старый ход
    if (playerMoves.length > 2) {
      playerMoves.shift(); // Удаляем первый (самый старый) элемент массива
    }
  }
  // Если бот активен, делаем ход после клика пользователя, но только если это не клик бота
  if (isBotActive && !isBotClick) { // Добавленная проверка на isBotClick
    // Получаем индекс последней кликнутой клетки
    const cellIndex = getCellIndexFromCell(cell);
    // Вызываем функцию для хода бота
    setTimeout(() => botMakeMove(cellIndex), 1); // задержка для имитации "раздумий" бота
  }
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
function checkTaskCompletion() {
  if (drawingChanged) return false;
  let allCoordsCompleted = true;

  currentTask.coordinates.forEach((coord, index) => {
    const [letter, number] = splitCoordinate(coord); // Разделяем координату
    const cellIndex = getCellIndex(letter, number); // Получаем индекс клетки
    const cell = board.querySelector(`[data-index="${cellIndex}"]`);
    const coordElement = taskCoordinates.children[index];

    if (coordElement) {
      if (cell.classList.contains('taken')) {
        coordElement.classList.add('highlighted');
        coordElement.classList.remove('bhighlighted');
        coordElement.classList.add('fade-out'); // Добавляем класс .hidden для плавного исчезновения
      } else {
        coordElement.classList.remove('highlighted');
        coordElement.classList.remove('fade-out');
        coordElement.classList.add('bhighlighted');
        allCoordsCompleted = false;
      }
    }
  });

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
newGameButton.addEventListener('click', function(e) {
   ym(95445197,'reachGoal','newgame')
    const newGameId = Date.now().toString();
    const newLevelId = "0";  // Устанавливаем ID уровня на 0 для новой игры
    const newGameUrl = window.location.origin + window.location.pathname + '#/' + newGameId + '/' + newLevelId;
    newGameButton.href = newGameUrl;
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



// Проверка завершенности рисунка
let wasDrawingComplete = false;
function isDrawingJustCompleted() {
    const currentlyComplete = isDrawingComplete();
    if (!wasDrawingComplete && currentlyComplete) {
        wasDrawingComplete = true;
        return true;
    }
    wasDrawingComplete = currentlyComplete;
    return false;
}

//Конфетти у всех
function notifyCompletionToOthers() {
    // Записываем в Firebase текущее время
    database.ref('games/' + gameId + '/completed').set(Date.now());
}

//ЗАгружаем уровни


console.log("Starting to load level");
async function loadLevel(levelId) {
    drawingChanged = false;
    console.log("Function loadLevel is called with level:", levelId);

    // Очищаем текущую доску
    clearBoard();

    // Загружаем рисунок для текущего уровня
    loadDrawingForCurrentLevel();

    // Загружаем задание для текущего уровня
    await database.ref('levels/' + levelId).once('value').then(snapshot => {
        console.log("Data loaded for level", levelId, ":", snapshot.val());
        const levelData = snapshot.val();
        if (levelData && levelData.task) {
            currentTask = levelData.task;
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
    displayCoordinates();
}


async function setLevelHandlersAndLoadData() {
    console.log(`[DEBUG] Setting handlers and loading data for level ${currentLevel}`);

    // Отключаем предыдущие слушатели перед установкой новых
    const cellsRef = database.ref(`games/${gameId}/levels/${currentLevel}/cells`);
    const drawingRef = database.ref(`games/${gameId}/levels/${currentLevel}/drawing`);

    // Отключаем слушатели для cells
    cellsRef.off();

    // Отключаем слушатели для drawing

    drawingRef.off('child_changed', handleCellUpdate);
    drawingRef.off('child_added', handleCellUpdate);
    drawingRef.off('child_removed');

    // Устанавливаем новые слушатели для cells
    cellsRef.on('value', snapshot => {
      console.log(`[DEBUG] Raw Firebase update:`, snapshot.val());

        console.log(`[DEBUG] Firebase update detected for level ${currentLevel}`);

        const cellsState = snapshot.val();
          if (cellsState && currentLevel === 2) {  // Добавьте эту проверку
            allCells.forEach(cell => {
                const index = cell.dataset.index;
                if (cellsState[index]) {
                    cell.classList.add('taken');
                } else {
                    cell.classList.remove('taken');
                }
            });
        }
    });

    // Здесь вы можете установить другие слушатели для drawing, если это необходимо

    // Загрузка рисунка для текущего уровня
    await loadDrawingForCurrentGame(currentLevel);

    // Обновляем отображение уровня
    updateLevelDisplay();

    // После того, как рисунок загружен, вызываем loadLevel
    loadLevel(currentLevel);
}

console.log("Type of currentLevel:", typeof currentLevel);



// Кнопульки
// Кнопки
const prevLevelButton = document.getElementById('prevLevel');
const nextLevelButton = document.getElementById('nextLevel');
prevLevelButton.addEventListener('click', () => {

        ym(95445197, 'reachGoal', 'prevLevelClick');
console.log(`[DEBUG] prevLevelButton clicked. Current level: ${currentLevel}`);

    if (currentLevel > 0) {
        currentLevel--;
    } else {
        // Если на первом уровне, переключаемся на последний уровень.
        currentLevel = maxLevels - 1;
    }
  console.log(`[DEBUG] New current level: ${currentLevel}`);

    setLevelHandlersAndLoadData();
  setupFirebaseListeners();

    // Обновляем URL
    levelId = currentLevel.toString();
    window.location.hash = "#/" + gameId + "/" + levelId;
});

window.addEventListener('hashchange', function() {
    console.log(`[DEBUG] Hash changed: ${window.location.hash}`);
}, false);

nextLevelButton.addEventListener('click', () => {
        ym(95445197, 'reachGoal', 'nextLevelClick');

    console.log(`[DEBUG] nextLevelButton clicked. Current level: ${currentLevel}`);

    if (currentLevel < maxLevels - 1) {
        currentLevel++;
    } else {
        // Если на последнем уровне, переключаемся на первый уровень.
        currentLevel = 0;
    }
  console.log(`[DEBUG] New current level: ${currentLevel}`);

    setLevelHandlersAndLoadData();
  setupFirebaseListeners();

    // Обновляем URL
    levelId = currentLevel.toString();
    window.location.hash = "#/" + gameId + "/" + levelId;
});






function displayCoordinates() {
    taskCoordinates.innerHTML = '';
    currentTask.coordinates.forEach(coord => {
        const coordElement = document.createElement('div');
        coordElement.textContent = coord;
        taskCoordinates.appendChild(coordElement);
    });
    checkTaskCompletion();


}
function isDrawingComplete() {
    if (!currentTask || !currentTask.coordinates) {
        return false;
    }
    return currentTask.coordinates.every(coord => {
        const [letter, number] = splitCoordinate(coord);
        const cellIndex = getCellIndex(letter, number);
        const cell = board.querySelector(`[data-index="${cellIndex}"]`);
        return cell.classList.contains('taken');
    });
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

const zoomInButton = document.getElementById('zoomIn');
const zoomOutButton = document.getElementById('zoomOut');
const boardContainer = document.getElementById('board-container');



zoomInButton.addEventListener('click', function() {
    board.classList.remove('zoomed-out');
    boardContainer.classList.remove('zoomed-out');
    board.classList.add('zoomed-in');
    boardContainer.classList.add('zoomed-in');


    if (window.innerWidth < 768) {
        document.documentElement.style.setProperty('--cell-size', '8vw');
    } else {
        document.documentElement.style.setProperty('--cell-size', '2.5vw');
    }
    document.getElementById('board-container').style.height = board.scrollHeight + "px";  // Устанавливаем высоту board-container равной высоте доски
  verticalCoordinates.style.display = 'grid';
  horizontalCoordinates.style.display = 'grid';

    zoomInButton.disabled = true;
    zoomOutButton.disabled = false;

});


zoomOutButton.addEventListener('click', function() {
    board.classList.remove('zoomed-in');
    boardContainer.classList.remove('zoomed-in');
    board.classList.add('zoomed-out');
    boardContainer.classList.add('zoomed-out');

    document.documentElement.style.setProperty('--cell-size', '0.67vw');  
    document.getElementById('board-container').style.height = 'auto';  // Позволяем контейнеру board-container автоматически определять свою высоту
  verticalCoordinates.style.display = 'none';
  horizontalCoordinates.style.display = 'none';

    zoomOutButton.disabled = true;
    zoomInButton.disabled = false;

});




// S H A D O W   S C R O L L
// Функция для проверки положения скролла и управления тенями
function handleScroll() {
    const taskCoordinates = document.getElementById("taskCoordinates");
    const shadowContainer = taskCoordinates.parentElement;
    // Проверяем, требуется ли прокрутка
    if (taskCoordinates.scrollWidth <= taskCoordinates.clientWidth) {
        shadowContainer.classList.add("no-left-shadow");
        shadowContainer.classList.add("no-right-shadow");
        return;  // Выходим из функции, так как прокрутка не требуется
    }

    if (taskCoordinates.scrollLeft === 0) {
        shadowContainer.classList.add("no-left-shadow");
    } else {
        shadowContainer.classList.remove("no-left-shadow");
    }

    if (taskCoordinates.scrollLeft + taskCoordinates.clientWidth >= taskCoordinates.scrollWidth) {
        shadowContainer.classList.add("no-right-shadow");
    } else {
        shadowContainer.classList.remove("no-right-shadow");
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const taskCoordinates = document.getElementById("taskCoordinates");
    const shadowContainer = taskCoordinates.parentElement; // Получаем родительский элемент (.shadow-container)

    // Начало добавленного кода
    const observer = new MutationObserver(function(mutationsList, observer) {
        for(let mutation of mutationsList) {
            if (mutation.type === 'childList') {
                handleScroll();
            }
        }
    });

    observer.observe(taskCoordinates, { childList: true });
    // Конец добавленного кода

    // Инициализируем тени при загрузке страницы
    handleScroll();

    // Добавляем слушатель событий на прокрутку
    taskCoordinates.addEventListener("scroll", handleScroll);

    // Добавляем задержку для повторной проверки положения скролла
    setTimeout(handleScroll, 1000);  // проверка через 1 секунду
});



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

// Переменная для отслеживания состояния бота
let isBotActive = false;

// Функция для переключения состояния бота
function toggleBot() {
    isBotActive = !isBotActive;
    const botToggleButton = document.getElementById('botToggle');
    botToggleButton.textContent = isBotActive ? '🤖 ON' : '🤖 OFF';
}

// Обработчик для кнопки переключения бота
document.getElementById('botToggle').addEventListener('click', toggleBot);



// Функция для получения индекса из объекта клетки
function getCellIndexFromCell(cell) {
    // Возможно, вам нужно будет адаптировать эту функцию под вашу логику получения индекса
    return cell.dataset.index;
}
function indexToCoords(index) {
    const x = index % cellsCount; // Получаем координату X, используя остаток от деления
    const y = Math.floor(index / cellsCount); // Получаем координату Y, используя целочисленное деление
    return {x, y};
}

// Функция для выбора случайной клетки ботом
function botMakeMove(lastClickedCellIndex) {
    // Преобразуем индекс в координаты
    const lastClickedCellCoords = indexToCoords(lastClickedCellIndex);

    // Выбираем случайный индекс клетки
    let botCellIndex;
    let attempts = 0;
    do {
        botCellIndex = getRandomCellIndex(lastClickedCellCoords);
        attempts++;
        // Предотвратим потенциальный бесконечный цикл
        if (attempts > 100) {
            console.error("Can't find a valid move for the bot.");
            return;
        }
    } while (removedCells.includes(botCellIndex));

    // Имитируем клик по клетке
    const botCell = board.querySelector(`[data-index="${botCellIndex}"]`);
    if (botCell && !botCell.classList.contains('taken')) {
        handleCellClick(botCell, true); // Передаем true, чтобы указать, что это ход бота
    }
}



function getRandomCellIndex(coords) {
  // Переменные для координат и индекса клетки бота
  let botCellIndex;
  let botCell;

  // Проверяем, достаточно ли ходов сделал игрок для определения направления
  if (playerMoves.length >= 2) {
    // Получаем координаты двух последних ходов
    const [secondLastMove, lastMove] = playerMoves.slice(-2).map(indexToCoords);
    // Вычисляем направление между последними двумя ходами
    const direction = {
      x: lastMove.x - secondLastMove.x,
      y: lastMove.y - secondLastMove.y
    };

    // Нормализуем направление (делаем шаг равным 1 клетке)
    if (direction.x !== 0) direction.x /= Math.abs(direction.x);
    if (direction.y !== 0) direction.y /= Math.abs(direction.y);

    // Пытаемся сделать ход в том же направлении
    let nextX = lastMove.x + direction.x;
    let nextY = lastMove.y + direction.y;

    // Проверяем, что следующая клетка в пределах поля и свободна
    if (isCellFreeAndValid(nextX, nextY)) {
      botCellIndex = nextY * cellsCount + nextX;
      return botCellIndex;
    } else {
      // Если клетка занята или за пределами поля, пытаемся сделать ход по горизонтали или вертикали
      nextX = lastMove.x + (direction.x === 0 ? 1 : 0);
      nextY = lastMove.y + (direction.y === 0 ? 1 : 0);
      if (isCellFreeAndValid(nextX, nextY)) {
        botCellIndex = nextY * cellsCount + nextX;
        return botCellIndex;
      }
    }
  }

  // Если направление не определено или не удалось продолжить линию, делаем случайный ход вблизи последнего хода игрока
do {
        const dx = Math.floor(Math.random() * (maxDistance - minDistance + 1)) + minDistance;
        const dy = Math.floor(Math.random() * (maxDistance - minDistance + 1)) + minDistance;

        let randomX = coords.x + dx;
        let randomY = coords.y + dy;

        botCellIndex = randomY * cellsCount + randomX;

        // Проверяем, что клетка свободна, не удалена и находится в пределах поля
        botCell = board.querySelector(`[data-index="${botCellIndex}"]`);
    } while (
        randomX < 0 || randomY < 0 ||
        randomX >= cellsCount || randomY >= cellsCount ||
        !botCell || botCell.classList.contains('taken') ||
        removedCells.includes(botCellIndex)
    );

    return botCellIndex;
}

// Вспомогательная функция для проверки, свободна ли клетка и находится ли она в пределах поля
function isCellFreeAndValid(x, y) {
  if (x < 0 || y < 0 || x >= cellsCount || y >= cellsCount) {
    return false;
  }
  const cellIndex = y * cellsCount + x;
  const cell = board.querySelector(`[data-index="${cellIndex}"]`);
  return cell && !cell.classList.contains('taken');
}


