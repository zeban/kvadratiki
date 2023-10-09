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
let gameId = window.location.hash.split('/').pop();
let isNewGame = !gameId || gameId === 'play';
let isCompleted = false; // завершен ли рисунок
function isDrawingJustCompleted() {
    if (!isCompleted && isDrawingComplete()) {
        isCompleted = true;
        return true;
    }
    return false;
}



// Инициализация или получение ID пользователя
let userId = localStorage.getItem('userId');
if (!userId) {
    userId = Date.now().toString();
    localStorage.setItem('userId', userId);
}


//слушател ьдля показа конфети другим
// Теперь добавляем слушатель для Firebase
database.ref('games/' + gameId + '/completionEvent').on('value', snapshot => {
    const lastCompletionEvent = snapshot.val();
    
    if (lastCompletionEvent && (Date.now() - lastCompletionEvent.timestamp) <= 5 * 60 * 1000) {
        celebrateCompletion(); // Это ваша функция для показа конфети или другого уведомления
    }
})

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



// Обработка кликов по доске
board.addEventListener('click', function(e) {
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
        }

        checkTaskCompletion();
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
    const letter = coord.match(/[A-Z]+/)[0];
    const number = parseInt(coord.match(/\d+/)[0], 10);
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
    checkAndCelebrateCompletion();
});

database.ref('games/' + gameId + '/cells/').on('child_added', (snapshot) => {
    handleCellUpdate(snapshot);
    checkAndCelebrateCompletion();
});

database.ref('games/' + gameId + '/cells/').on('child_removed', (snapshot) => {
    const cellIndex = snapshot.key;
    const cell = board.querySelector(`[data-index="${cellIndex}"]`);
    cell.classList.remove('taken');
    delete cell.dataset.owner;

    checkAndCelebrateCompletion();
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
let currentTask = {
    name: 'Маленькое Сердце',
    coordinates: ['C2', 'D2', 'F2', 'G2', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3', 'H3', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4', 'H4', 'C5', 'D5', 'E5', 'F5', 'G5', 'D6', 'E6', 'F6']
};



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
