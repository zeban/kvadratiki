// === Настройки Firebase ===
const firebaseConfig = {
    apiKey: "AIzaSyBRFHQZYMG6QSA1gyw8lHw0gIhVajpvgjU",
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

const initialLevelId = 0;
let [_, gameId, levelId] = window.location.hash.split('/');
if (levelId !== undefined) {
  currentLevel = parseInt(levelId, 10);
} else {
  // Если в URL нет levelId, устанавливаем начальный уровень (если это необходимо)
  currentLevel = 0;
}
let drawingChanged = false;
loadLevel(currentLevel);

let isNewGame = !gameId || gameId === 'play';
let currentBoardState = {};

if (!gameId || gameId === 'play') {
    gameId = Date.now().toString();

if (!gameId || gameId === 'play') {
    gameId = Date.now().toString();
}
if (!levelId) {
    levelId = initialLevelId.toString();  // default value for the initial level

}
window.location.hash = "#/" + gameId + "/" + levelId;

}

let currentTask = null;
if (!currentTask) {
    currentTask = {
        coordinates: []
    };
}
let allCells = [];

// Инициализация или получение ID пользователя
let userId = localStorage.getItem('userId');
if (!userId) {
    userId = Date.now().toString();
    localStorage.setItem('userId', userId);
}

loadTaskForLevel(initialLevelId);
loadDrawingForCurrentGame(initialLevelId);

let lastCompletionTime = 0;  // глобальная переменная
database.ref('games/' + gameId + '/completed').on('value', snapshot => {
    const completionTime = snapshot.val();
    // Если есть новое уведомление, показываем конфети
    if (completionTime && completionTime !== lastCompletionTime) {
        celebrateCompletion();
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
// Обработка кликов по доске
// Обработка кликов по доске
board.addEventListener('click', function(e) {
    if (e.target.classList.contains('cell')) {
        drawingChanged = true;
        const cell = e.target;
        const index = cell.dataset.index;
        const cellRef = database.ref(`games/${gameId}/levels/${currentLevel}/cells/${index}`);

        // Проверяем текущее состояние клетки в базе данных
        cellRef.once('value').then(snapshot => {
            const isTaken = snapshot.val();
            if (isTaken) {
                // Если ячейка "занята", удаляем её из базы данных и убираем класс "занята"
                cell.classList.remove('taken');
                checkTaskCompletion();   // <-- Добавлено
                cellRef.remove();
            } else {
                // В противном случае добавляем информацию в базу данных и делаем ячейку "занятой"
                cell.classList.add('taken');
                checkTaskCompletion();   // <-- Добавлено
                cellRef.set(true);
            }
          drawingChanged = false; 
          displayCoordinates(); // <-- Добавьте этот вызов

            // После изменения состояния ячейки проверяем выполнение задачи и отправляем изменения в реальном времени
            if (isDrawingJustCompleted()) {
                celebrateCompletion();
                notifyCompletionToOthers();
            } else if (!isDrawingComplete()) {
                database.ref('games/' + gameId + '/completed').remove();
            }
        });
    }
});






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
            } else {
              coordElement.classList.remove('highlighted');
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
        cell.classList.add('taken');
        cell.dataset.owner = cellOwner;
    } else {
        cell.classList.remove('taken');
        delete cell.dataset.owner;
    }
}
// слушатель конфетти для всех
let lastCelebratedCompletion = 0;
database.ref('games/' + gameId + '/completed').on('value', (snapshot) => {
    const completionTime = snapshot.val();
    if (completionTime && completionTime > lastCelebratedCompletion) {
        celebrateCompletion();
        lastCelebratedCompletion = completionTime;
    }
});
database.ref('games/' + gameId + '/cells/').on('child_changed', (snapshot) => {
    handleCellUpdate(snapshot);
});
database.ref('games/' + gameId + '/cells/').on('child_added', (snapshot) => {
    handleCellUpdate(snapshot);
});
database.ref('games/' + gameId + '/cells/').on('child_removed', (snapshot) => {
    const cellIndex = snapshot.key;
    const cell = board.querySelector(`[data-index="${cellIndex}"]`);
    cell.classList.remove('taken');
    delete cell.dataset.owner;
});
// Обработка кнопок "Поделиться" и "Новая игра"
const shareButton = document.getElementById('shareButton');
shareButton.addEventListener('click', function() {
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
    const newGameId = Date.now().toString();
    const newGameUrl = window.location.origin + window.location.pathname + '#/play/' + newGameId;
    newGameButton.href = newGameUrl;
});
// З А Д А Н И Я
// рисунок
// Переменная для хранения текущего уровня

database.ref(`games/${gameId}/levels/${currentLevel}/cells`).off('value');
database.ref(`games/${gameId}/levels/${currentLevel}/cells`).on('value', snapshot => {
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
taskButton.addEventListener('click', function() {
    taskCoordinates.innerHTML = '';
    currentTask.coordinates.forEach(coord => {
        const coordElement = document.createElement('div');
        coordElement.textContent = coord;
        taskCoordinates.appendChild(coordElement);
    });
    checkTaskCompletion();

    // Тогглим панель заданий
    if (taskPanel.style.display === 'flex') {
        taskPanel.style.display = 'none'; // скрываем панель, если она открыта
    } else {
        taskPanel.style.display = 'flex'; // показываем панель, если она закрыта
    }
});



// Кофетти
let lastCelebrationTime = 0;
const CELEBRATION_INTERVAL = 10000; // 10 секунд
function celebrateCompletion() {
   drawingChanged = false;
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
const taskCoordinatesElement = document.getElementById('taskCoordinates');

function loadLevel(levelId) {
    drawingChanged = false;
    console.log("Function loadLevel is called with level:", levelId);
    
    // Очищаем текущую доску
    clearBoard();

    // Загружаем рисунок для текущего уровня
    loadDrawingForCurrentLevel();

    // Загружаем задание для текущего уровня
    database.ref('levels/' + levelId).once('value').then(snapshot => {
        console.log("Data loaded for level", levelId, ":", snapshot.val());
        const levelData = snapshot.val();
        if (levelData && levelData.task) {
            currentTask = levelData.task;
            updateTaskPanel();   // <-- Обновляем панель заданий
            console.log('Загруженные данные уровня:', currentTask);
        } else {
            console.error('Ошибка: данные уровня не содержат задания.');
        }
    }).catch(error => {
        console.error("Ошибка при загрузке уровня:", error);
    });
}

function updateTaskPanel() {
    drawingChanged = false;
    displayCoordinates();
}



// Кнопульки
const prevLevelButton = document.getElementById('prevLevel');
const nextLevelButton = document.getElementById('nextLevel');

prevLevelButton.addEventListener('click', () => {
    if (currentLevel > 0) {
        // Отключаем слушатель для текущего уровня
        database.ref(`games/${gameId}/levels/${currentLevel}/cells`).off('value');

        currentLevel--;
      updateLevelDisplay()

        // Устанавливаем слушатель для нового уровня
        database.ref(`games/${gameId}/levels/${currentLevel}/cells`).on('value', snapshot => {
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
      
      console.log("Loading level:", currentLevel);
        loadLevel(currentLevel); // Загрузить новый уровень

// Update levelId and URL after changing the level
levelId = currentLevel.toString();
window.location.hash = "#/" + gameId + "/" + levelId;

    }
});

nextLevelButton.addEventListener('click', () => {
    // Отключаем слушатель для текущего уровня
    database.ref(`games/${gameId}/levels/${currentLevel}/cells`).off('value');

    currentLevel++;
  updateLevelDisplay()

    // Устанавливаем слушатель для нового уровня
    database.ref(`games/${gameId}/levels/${currentLevel}/cells`).on('value', snapshot => {
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
  console.log("Loading level:", currentLevel);
    loadLevel(currentLevel); // Загрузить новый уровень

// Update levelId and URL after changing the level
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
    for (let coord of currentTask.coordinates) {
        const [letter, number] = splitCoordinate(coord);
        const cellIndex = getCellIndex(letter, number);
        const cell = board.querySelector(`[data-index="${cellIndex}"]`);
        if (!cell.classList.contains('taken')) {
            return false;
        }
    }
    return true;
}
function loadTaskForLevel(gameId, levelId) {
    database.ref(`games/${gameId}/levels/${levelId}/task`).once('value').then(snapshot => {
        const taskData = snapshot.val();
        console.log(`Загружено задание для уровня ${levelId}:`, taskData);
        if (!taskData) {
            console.error('Ошибка: нет данных для уровня', levelId);
            return;
        }
        currentTask = taskData;
      drawingChanged = false; 
        displayCoordinates();
    }).catch(error => {
        console.error("Ошибка при загрузке задания для уровня:", error);
    });
}



function loadDrawingForCurrentGame(levelId) {
  console.log("Загрузка рисунка для текущей игры началась");
  database.ref('games/' + gameId + '/' + levelId).once('value').then(snapshot => {
    const cells = snapshot.val() || {};
    console.log(`Загружен рисунок для уровня ${currentLevel}:`, cells);
    displayBoard(cells); 
    console.log("Загрузка рисунка для текущей игры завершилась");
  });
}


function displayBoard(cells) {
    console.log("Отображение данных на доске:", cells);

    // Сначала сбросьте состояние всех ячеек до начального
    const allCells = document.querySelectorAll('.cell');
    allCells.forEach(cell => {
        cell.classList.remove('taken');
    });

    // Заполните ячейки на основе данных из базы данных
    for (let index in cells) {
        if (cells[index]) {  // если ячейка заполнена
            const cellElement = document.querySelector(`.cell[data-index="${index}"]`);
            if (cellElement) {
                cellElement.classList.add('taken');
            }
        }
    }

    // Обновите состояние текущей доски
    currentBoardState = cells;
}




function clearBoard() {
    console.log("Очищаем доску");
    const allCells = document.querySelectorAll('.cell');
    allCells.forEach(cell => {
        cell.className = 'cell'; // это сбросит все классы ячейки к 'cell'
    });
}




function saveDrawingForCurrentLevel(cells) {
    // Используйте уникальный идентификатор уровня, например, currentLevel, как ключ
    const levelId = currentLevel; // Используйте уникальный идентификатор уровня
    const levelRef = database.ref(`games/${gameId}/levels/${levelId}/cells`);
    levelRef.set(cells);
}


function loadDrawingForCurrentLevel() {
    // Используйте уникальный идентификатор уровня, например, currentLevel, для загрузки рисунка
    const levelId = currentLevel; // Используйте уникальный идентификатор уровня
    const levelRef = database.ref(`games/${gameId}/levels/${levelId}/cells`);

    levelRef.once('value').then(snapshot => {
        const cells = snapshot.val() || {};
        console.log(`Загружен рисунок для уровня ${levelId}:`, cells);
        displayBoard(cells); // Отображаем рисунок на доске

        // Отправляем изменения в реальном времени в Firebase Realtime Database

    }).catch(error => {
        console.error("Ошибка при загрузке рисунка для уровня:", error);
    });
}

updateLevelDisplay();
