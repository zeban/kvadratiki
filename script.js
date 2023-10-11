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

const boardsState = {};



// === Настройки игры ===
const cellsCount = 150; 
const totalCells = cellsCount * cellsCount;
let gameId = window.location.hash.split('/').pop();
let isNewGame = !gameId || gameId === 'play';
let isCompleted = false; // завершен ли рисунок
let currentGameId;
if (window.location.hash.includes("/play/")) {
    currentGameId = window.location.hash.split("/")[2];
}

function isDrawingJustCompleted() {
  console.log("Checking if drawing just completed...");
    if (isDrawingComplete()) { // если рисунок завершен
     console.log("Drawing is complete...");
        if (!isCompleted) { // и если он раньше не был завершен
           console.log("...and it was not completed before.");
            isCompleted = true; // устанавливаем флаг
            return true; // и возвращаем true
        }
    } else { // если рисунок не завершен
       console.log("Drawing is not complete.");
        isCompleted = false; // сбрасываем флаг
    }
    return false;
}


let levels = [];
window.addEventListener('hashchange', handleHashChange);

// Инициализация или получение ID пользователя
let userId = localStorage.getItem('userId');
if (!userId) {
    userId = Date.now().toString();
    localStorage.setItem('userId', userId);
}

function handleHashChange() {
    const hashParts = window.location.hash.split('/');
    const gameIdPart = hashParts.findIndex(part => part === 'play');
    const levelPart = hashParts.findIndex(part => part === 'level');
    
    if (gameIdPart !== -1 && levelPart !== -1) {
        const gameId = hashParts[gameIdPart + 1];
        const levelId = hashParts[levelPart + 1];
        
        currentGameId = gameId;
        currentLevelIndex = levelId - 1;

        loadBoardForLevel(levels[currentLevelIndex].id);
    }
}



function handleInitialLoad() {
  if (currentLevelSubscription) {
    currentLevelSubscription.off();
}
    if (window.location.hash.includes("level")) {
        currentLevelIndex = parseInt(window.location.hash.split("/").pop()) - 1;
        loadBoardForLevel(levels[currentLevelIndex].id);
    }
}




async function loadLevels() {
    return database.ref('levels').once('value');
}
getCurrentLevelFromFirebase();

loadLevels().then(snapshot => {
    console.log('Полученные данные:', snapshot.val());  // Логирование для отладки
    const levelsData = snapshot.val();
    
    if (levelsData) {
        levels = Object.values(levelsData);
        console.log('Преобразованные уровни:', levels);  // Логирование для отладки
        
        // Добавляем проверку перед загрузкой уровня
        if (levels.length > 0 && typeof currentLevelIndex !== 'undefined' && levels[currentLevelIndex] && levels[currentLevelIndex].id) {
            loadBoardForLevel(levels[currentLevelIndex].id);
        } else {
            console.error('Ошибка: уровни не загружены, currentLevelIndex не определен или уровни имеют неверный формат.');
        }
    }
    createLevelButtons();
}).catch(error => {
    console.error("Ошибка при загрузке уровней:", error);
});



let currentLevelIndex = 0; // default value
getCurrentLevelFromFirebase();







//слушател ьдля показа конфети другим
// Теперь добавляем слушатель для Firebase
database.ref('games/' + gameId + '/completionEvent').on('value', snapshot => {
    const lastCompletionEvent = snapshot.val();
    
    if (lastCompletionEvent && (Date.now() - lastCompletionEvent.timestamp) <= 5 * 60 * 1000) {
        celebrateCompletion(); // Это ваша функция для показа конфети или другого уведомления
    }
})


// Create level buttons based on the total number of levels and the current unlocked level
function createLevelButtons() {
    const levelsContainer = document.getElementById('levelsContainer');
    const unlockedLevel = parseInt(localStorage.getItem('currentLevel') || 1);

    for (let i = 1; i <= levels.length; i++) {
        const levelButton = document.createElement('button');
        levelButton.textContent = i;
        levelButton.onclick = () => switchToLevel(i);
        
        // Disable the button if the level is not yet unlocked
        if (i > unlockedLevel) {
            levelButton.disabled = true;
        }
        
        levelsContainer.appendChild(levelButton);
    }
}

// Switch to a particular level
function switchToNextLevel() {
    if (currentLevelIndex < levels.length - 1) {
        currentLevelIndex++;
        switchToLevel(currentLevelIndex + 1); // Так как индексы начинаются с 0, добавляем 1
        updateLevelUI();
      handleHashChange(); 
    } else {
        alert("Поздравляем! Вы завершили все уровни!");
    }
}



document.getElementById('prevLevel').addEventListener('click', function() {
    if (currentLevelIndex > 0) {
        currentLevelIndex--;
        const newURL = `#/play/${currentGameId}/level/${currentLevelIndex + 1}`;
        window.location.href = newURL; // Меняем URL
        window.location.reload(true);  // Принудительно перезагружаем страницу
    } else {
        alert("Это первый уровень!");
    }
});

document.getElementById('nextLevel').addEventListener('click', function() {
    if (currentLevelIndex < levels.length - 1) {
        currentLevelIndex++;
        const newURL = `#/play/${currentGameId}/level/${currentLevelIndex + 1}`;
        window.location.href = newURL; // Меняем URL
        window.location.reload(true);  // Принудительно перезагружаем страницу
    } else {
        alert("Вы на последнем уровне!");
    }
});







//Функцию для сохранения текущего состояния игрового поля:
function saveCurrentBoardState() {
    const takenCells = document.querySelectorAll('.cell.taken');
    const cellsData = {};
    takenCells.forEach(cell => {
        const index = cell.dataset.index;
        cellsData[index] = userId;
    });
    database.ref('games/' + gameId + '/levels/' + (currentLevelIndex + 1) + '/cells').set(cellsData);
}


//Обновление интерфейса после завершения уровня

async function updateLevelUI() {
    const levelsContainer = document.getElementById('levelsContainer');
    let unlockedLevel = 1; // по умолчанию разблокирован только первый уровень

    // Получаем текущий уровень из Firebase
    await database.ref('users/' + userId + '/currentLevel').once('value').then(snapshot => {
        const levelFromDB = snapshot.val();
        if (levelFromDB) {
            unlockedLevel = levelFromDB;
        }
    });

    levelsContainer.childNodes.forEach((button, index) => {
        if (index + 1 <= unlockedLevel) {
            button.disabled = false;
        } else {
            button.disabled = true;
        }
    });
}



//
async function getCurrentLevelFromFirebase() {
    try {
        const snapshot = await database.ref('users/' + userId + '/currentLevel').once('value');
        const levelFromDB = snapshot.val();
        if (levelFromDB) {
            currentLevelIndex = levelFromDB - 1;
        }

    } catch (error) {
        console.error("Ошибка при загрузке текущего уровня из Firebase:", error);
    }
}

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
    verticalCoordinates.innerHTML += `<div style="flex: 1; display: flex; align-items: center; justify-content: center;">${i+1}</div>`;
    horizontalCoordinates.innerHTML += `<div style="flex: 1; display: flex; align-items: center; justify-content: center">${horizontalLabels[i]}</div>`;
}

// Создание игрового поля
const board = document.getElementById('board');
const fragment = document.createDocumentFragment();
for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.index = i;
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

// Проверяем соответсвие клетки правилам в задании
function updateTaskCoordinatesColor() {
    const takenCells = document.querySelectorAll('.cell.taken');
    const takenCoords = Array.from(takenCells).map(cell => cell.dataset.coord);
    
    taskCoordinates.childNodes.forEach(coordinateDiv => {
        const coords = coordinateDiv.textContent.split('-');
        const coordString = `${coords[0]}${coords[1]}`;

        if (takenCoords.includes(coordString)) {
            coordinateDiv.style.color = 'green';
        } else {
            coordinateDiv.style.color = 'black';
        }
    });
}




// Обработка кликов по доске К А К А Я  В А Ж Н А Я Ш Т У К А 
board.addEventListener('click', function(e) {
  if (!e.target.classList.contains('cell')) return;
    if (e.target.classList.contains('cell')) {
        const cell = e.target;
        const index = cell.dataset.index;
        if (cell.classList.contains('taken')) {
            database.ref('games/' + gameId + '/cells/' + index).remove();
        } else {
            database.ref('games/' + gameId + '/cells/' + index).set(userId);
        }

   if (isDrawingJustCompleted()) {
    celebrateCompletion(); 
    notifyCompletionToOthers();
    saveCurrentLevelToFirebase(currentLevelIndex + 1);
    updateLevelUI();
}



        checkTaskCompletion();
      saveBoardState(currentLevel.id);
    }
});



//Отмечаем выполненные координаты
function checkTaskCompletion() {
   let allCoordsCompleted = true;
   
   currentTask.coordinates.forEach((coord, index) => {
        const [letter, number] = splitCoordinate(coord);
        const cellIndex = getCellIndex(letter, number);
        const cell = board.querySelector(`[data-index="${cellIndex}"]`);
        const coordElement = taskCoordinates.children[index];

        if (coordElement) {
            if (cell.classList.contains('taken')) {
                coordElement.style.color = 'green'; 
            } else {
                coordElement.style.color = 'black';
                allCoordsCompleted = false;
            }
        }
    });
    
    return allCoordsCompleted;
}


function splitCoordinate(coord) {
    const letterMatch = coord.match(/[A-Z]+/);
    const numberMatch = coord.match(/\d+/);

    if (!letterMatch || !numberMatch) {
        console.error("Некорректная координата:", coord);
        return [null, null];
    }

    const letter = letterMatch[0];
    const number = parseInt(numberMatch[0], 10);
    return [letter, number];
}


function getCellIndex(letter, number) {
    const columnIndex = horizontalLabels.indexOf(letter);
    return (number - 1) * cellsCount + columnIndex;
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
    if (isDrawingJustCompleted()) {
        celebrateCompletion();
    }
});

database.ref('games/' + gameId + '/cells/').on('child_added', (snapshot) => {
    handleCellUpdate(snapshot);
    if (isDrawingJustCompleted()) {
        celebrateCompletion();
    }
});


database.ref('games/' + gameId + '/cells/').on('child_removed', (snapshot) => {
    const cellIndex = snapshot.key;
    const cell = board.querySelector(`[data-index="${cellIndex}"]`);
    cell.classList.remove('taken');
    delete cell.dataset.owner;

    if (isDrawingJustCompleted()) {
        celebrateCompletion();
    }
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
/*let currentTask = {
    name: 'Маленькое Сердце',
    coordinates: ['C2', 'D2', 'F2', 'G2', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3', 'H3', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4', 'H4', 'C5', 'D5', 'E5', 'F5', 'G5', 'D6', 'E6', 'F6']
};
*/


// обработчик для этой кнопки-шторки:
const taskButton = document.getElementById('taskButton');
const taskPanel = document.getElementById('taskPanel');
const taskCoordinates = document.getElementById('taskCoordinates');

taskButton.addEventListener('click', function() {
    taskCoordinates.innerHTML = ''; 
    currentTask.coordinates.forEach(coord => {
        const coordElement = document.createElement('div');
        coordElement.textContent = coord;
        taskCoordinates.appendChild(coordElement);
    });
  
      checkTaskCompletion();
  
    taskPanel.style.display = 'block'; // показываем панель
});



// закрыть шторку
const closeTaskPanelButton = document.getElementById('closeTaskPanel');

closeTaskPanelButton.addEventListener('click', function() {
    taskPanel.style.display = 'none';
});


// Кофетти
let lastCelebrationTime = 0;
const CELEBRATION_INTERVAL = 10000; // 10 секунд

function celebrateCompletion() {
  console.log("Checking if it's time to celebrate...");
    const currentTime = Date.now();
    if (currentTime - lastCelebrationTime > CELEBRATION_INTERVAL) {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
        lastCelebrationTime = currentTime;
    }
  // Обновляем интерфейс уровней
    updateLevelUI();
}


// Проверка завершенности рисунка
function isDrawingComplete() {
    for (let coord of currentTask.coordinates) {
        const [letter, number] = splitCoordinate(coord);
        const cellIndex = getCellIndex(letter, number);
        const cell = board.querySelector(`[data-index="${cellIndex}"]`);
        
        if (!cell.classList.contains('taken')) {
            return false; // Если хоть одна координата не окрашена, рисунок не завершен
        }
    }
    return true; // Если все координаты окрашены
}

//Конфетти у всех
function notifyCompletionToOthers() {
    database.ref('games/' + gameId + '/completed').set(Date.now());
}


///////////////////////////// Загружаем уровни!





// Загрузка данных уровня


let currentTask = {
    name: '',
    coordinates: []
};


let currentLevelSubscription;  // Эта переменная будет хранить текущую подписку на обновления доски

async function loadBoardForLevel(levelId) {
    // Очищаем доску перед восстановлением состояния


    // Восстановление состояния доски
    if (boardsState[levelId]) {
        boardsState[levelId].forEach(index => {
            board.children[index].classList.add('taken');
        });
    }

    // Загрузка задания для уровня
    await database.ref('levels/' + levelId).once('value').then(snapshot => {
        const levelData = snapshot.val();
        if (levelData && levelData.task.coordinates) {
            currentTask.name = levelData.name || ''; 
            currentTask.coordinates = levelData.task.coordinates || [];
          updateTaskUI();
            for (let coord of levelData.task.coordinates) {
                const [letter, number] = splitCoordinate(coord);
                const cell = board.querySelector(`[data-letter="${letter}"][data-number="${number}"]`);
                if (cell) {
                    cell.classList.add('taken');
                    cell.classList.add('task-cell');  // Добавляем дополнительный класс
                }
            }
          const taskCoordinatesDiv = document.getElementById('taskCoordinates');
            taskCoordinatesDiv.textContent = currentTask.coordinates.join(', ');
        } else {
            console.error("Ошибка: нет данных task.coordinates для уровня с ID:", levelId);
        }
    }).catch(error => {
        console.error("Ошибка при загрузке данных уровня:", error);
      renderBoard();  
    });
  document.getElementById('taskCoordinates').textContent = currentTask.coordinates.join(', ');
const taskCoordinatesDiv = document.getElementById("taskCoordinates");
taskCoordinatesDiv.textContent = currentTask.coordinates.join(', ');

}


function displayTaskCoordinates(coordinates) {
    const taskCoordinates = document.getElementById('taskCoordinates');
    taskCoordinates.innerHTML = ''; // очищаем предыдущие координаты

    coordinates.forEach(coord => {
        const coordDiv = document.createElement('div');
        coordDiv.textContent = coord;
        taskCoordinates.appendChild(coordDiv);
    });
}







function saveBoardForLevel(levelId) {
    const takenCoordinates = [];

    boardCells.forEach(cell => {
        if (cell.classList.contains('taken')) {
            takenCoordinates.push(cell.getAttribute('data-index'));
        }
    });

    const levelData = {
        task: {
            coordinates: takenCoordinates
            // Возможно, вам также стоит сохранять и другую информацию о задаче, такую как name. Если да, добавьте её сюда.
        }
    };

    database.ref('levels/' + levelId).set(levelData);
}



//проверяет, завершен ли какой-то конкретный уровень ранее. Эта функция полезна при попытке переключения на следующий уровень, чтобы узнать, не завершен ли он уже ранее
function isLevelCompleted(levelId) {
    return new Promise(resolve => {
        database.ref('levels/' + levelId + '/completed').once('value').then(snapshot => {
            resolve(!!snapshot.val()); // Возвращает true, если уровень завершен, иначе false
        });
    });
}

// Эта функция проверяет, завершен ли рисунок, и если да, то завершает уровень и переключается на следующий
async function checkAndCompleteLevel(levelId) {
    if (isDrawingComplete()) {  // Проверка, завершен ли рисунок на доске, уже была в вашем коде
        markLevelAsCompleted(levelId);
        // Переключаемся на следующий уровень
        if (currentLevelIndex < levels.length - 1) {
            switchToNextLevel();
        } else {
            alert("Поздравляем! Вы завершили все уровни!");
        }
    }
}


// При завершении уровня
function markLevelAsCompleted(levelId) {
    database.ref('levels/' + levelId + '/completed').set(Date.now());
}

// Переключение на следующий уровень
function switchToNextLevel() {
    if (currentLevelIndex < levels.length - 1) {
        // Обновляем интерфейс уровней
        updateLevelUI();
    } else {
        alert("Поздравляем! Вы завершили все уровни!");
    }
}


//передаем координаты уровней
async function loadTaskForLevel(levelId) {
    const snapshot = await database.ref('levels/' + levelId + '/task').once('value');
    const taskData = snapshot.val();
    
    if (taskData) {
        currentTask = {
            name: taskData.name,
            coordinates: taskData.coordinates
        };
        
        updateTaskCoordinatesDisplay();
    }
}

function updateTaskCoordinatesDisplay() {
    taskCoordinates.innerHTML = ''; 
    currentTask.coordinates.forEach(coord => {
        const coordElement = document.createElement('div');
        coordElement.textContent = coord;
        taskCoordinates.appendChild(coordElement);
    });
}

function saveBoardState(levelId) {
    boardsState[levelId] = Array.from(board.querySelectorAll('.cell.taken:not(.task-cell)')).map(cell => cell.dataset.index);
}

handleHashChange();
window.addEventListener("hashchange", handleHashChange);

