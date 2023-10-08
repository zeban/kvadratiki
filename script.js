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

// Инициализация или получение ID пользователя
let userId = localStorage.getItem('userId');
if (!userId) {
    userId = Date.now().toString();
    localStorage.setItem('userId', userId);
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
    }
});

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

database.ref('games/' + gameId + '/cells/').on('child_changed', handleCellUpdate);
database.ref('games/' + gameId + '/cells/').on('child_added', handleCellUpdate);
database.ref('games/' + gameId + '/cells/').on('child_removed', snapshot => {
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

// РИСОВАНИЕ ПО ЗАДАНИЮ

const drawingTaskButton = document.getElementById('drawingTaskButton');
const taskPanel = document.getElementById('taskPanel');
const taskCoordinatesList = document.getElementById('taskCoordinates');

drawingTaskButton.addEventListener('click', function() {
    // Здесь можно загрузить задание из базы данных
    // Но пока что будем использовать простой массив координат:
    const taskCoordinates = ["A1", "B2", "C3"]; 

    taskCoordinatesList.innerHTML = "";
    taskCoordinates.forEach(coord => {
        const listItem = document.createElement('li');
        listItem.innerText = coord;
        listItem.dataset.coordinate = coord;
        taskCoordinatesList.appendChild(listItem);
    });

    taskPanel.classList.remove('hidden');
});
