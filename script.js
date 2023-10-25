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
let isFirstLoad = true;

let [_, gameId, levelId] = window.location.hash.split('/');

if (levelId !== undefined) {
  currentLevel = parseInt(levelId, 10);
} else {
  // Если в URL нет levelId, устанавливаем начальный уровень (если это необходимо)
  currentLevel = 0;
}
let drawingChanged = false;
loadLevel(currentLevel);

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


let maxLevels;
database.ref('levels').once('value').then(snapshot => {
    const levels = snapshot.val();
    maxLevels = Object.keys(levels).length;
    console.log("Total levels available:", maxLevels);
});



// Инициализация или получение ID пользователя
let userId = localStorage.getItem('userId');
if (!userId) {
    userId = Date.now().toString();
    localStorage.setItem('userId', userId);
}


loadDrawingForCurrentGame(initialLevelId);

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
// Обработка кликов по доске
// Обработка кликов по доске
board.addEventListener('click', function(e) {
    if (e.target.classList.contains('cell')) {
      database.ref(`games/${gameId}/levels/${currentLevel}/cells`).on('value', function(snapshot) {
          console.log("Firebase value event triggered:", snapshot.val());
         updateTaskPanel();
      });


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
              showConfetti();
              markLevelAsCompleted();
              checkLevelCompletion();
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
    console.log(`Для координаты ${coord} буква: ${letter}, число: ${number}`); // Для диагностики
    return [letter, number];
}

function getCellIndex(letter, number) {
    const columnIndex = horizontalLabels.indexOf(letter);
    const index = (number - 1) * cellsCount + columnIndex;
    console.log(`Для координаты ${letter}${number} индекс ячейки: ${index}`); // Для диагностики
    return index;
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
        showConfetti();
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
        shareButton.innerText = "Ссылка скопирована, отправьте друзьям!";
        setTimeout(() => {
            shareButton.innerText = "Играть с друзьями";
        }, 3000);
    }
});
newGameButton.addEventListener('click', function(e) {
    const newGameId = "0";
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
let levelCompleted = false;
let wasDrawingComplete = false;

function isDrawingJustCompleted() {
    const currentlyComplete = isDrawingComplete();
    if (!wasDrawingComplete && currentlyComplete && !isFirstLoad) {
        wasDrawingComplete = true;
        return true;
    }
    wasDrawingComplete = currentlyComplete;
    isFirstLoad = false; // Сбросить флаг первой загрузки после первой проверки
    return false;
}



//Конфетти у всех
function notifyCompletionToOthers() {
    // Записываем в Firebase текущее время
    database.ref('games/' + gameId + '/completed').set(Date.now());
}

//ЗАгружаем уровни


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
   console.log("Before change: currentLevel =", currentLevel);
   if (currentLevel > 0) {
       currentLevel--;
   } else {
       currentLevel = maxLevels - 1;  // Если на первом уровне, переключаемся на последний уровень.
   }
   console.log("After change: currentLevel =", currentLevel);

   // Отключаем слушатели для текущего уровня
   database.ref(`games/${gameId}/levels/${currentLevel}/cells`).off('value');
   database.ref('games/' + gameId + '/completedLevels/' + currentLevel).off('value');

   updateLevelDisplay();

   // Устанавливаем слушатели для нового уровня
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
   setTimeout(checkScrollRequired, 100);

   // Update levelId and URL after changing the level
   levelId = currentLevel.toString();
   window.location.hash = "#/" + gameId + "/" + levelId;
});




nextLevelButton.addEventListener('click', () => {
   console.log("Before change: currentLevel =", currentLevel);
  if (currentLevel < maxLevels - 1) {
      currentLevel++;
  } else {
      currentLevel = 0;  // Если на последнем уровне, переключаемся на первый уровень.
  }
   console.log("After change: currentLevel =", currentLevel);
  

    // Отключаем слушатель для текущего уровня
    database.ref(`games/${gameId}/levels/${currentLevel}/cells`).off('value');

    // Отключаем старый слушатель
    database.ref('games/' + gameId + '/completedLevels/' + currentLevel).off('value');

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
  // Вызывать функцию checkScrollRequired с задержкой в 1.5 секунды после загрузки уровня
  setTimeout(checkScrollRequired, 100);

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

 copyCellsToGame(levelId);

async function loadDrawingForCurrentGame(levelId) {
    console.log("Загрузка рисунка для текущей игры началась");
   copyCellsToGame(levelId);
    console.log("loadDrawingForCurrentGame вызвана с levelId:", levelId);

    const levelRef = database.ref('games/' + gameId + '/levels/' + levelId + '/cells');

    try {
        console.log("Попытка получения данных из Firebase...");
        let cells = await fetchCellsFromFirebase(levelRef);

        if (!cells || Object.keys(cells).length === 0) {
            console.log("Ячейки отсутствуют, начинаем процесс копирования...");
            await copyCellsToGame(levelId);
            // После копирования, дождитесь загрузки данных
            cells = await levelRef.once('value').then(snap => snap.val());
        }

        console.log(`Загружен рисунок для уровня ${currentLevel}:`, cells);
        displayBoard(cells);
        console.log("Загрузка рисунка для текущей игры завершилась");

    } catch (error) {
        console.error("Ошибка при загрузке рисунка:", error);
    }
}









function displayBoard(cells) {
    console.log("Запуск функции displayBoard с данными:", cells);

    const allCells = document.querySelectorAll('.cell');
    let takenCount = 0;  // счетчик для ячеек с состоянием "taken"

    allCells.forEach(cell => {
        const index = cell.dataset.index;
      if (cells[index]) {
          console.log(`Обработка ячейки с индексом ${index}. Состояние в данных:`, cells[index]);
      }


        if (cells[index]) {
            cell.classList.add('taken');
            takenCount++;
        } else {
            cell.classList.remove('taken');
        }
    });

    currentBoardState = cells;
    console.log(`Завершение функции displayBoard. Обработано ячеек: ${allCells.length}. Из них taken: ${takenCount}`);
}







function clearBoard() {
    console.log("Запуск функции clearBoard");
    const allCells = document.querySelectorAll('.cell');
    allCells.forEach(cell => {
        cell.className = 'cell';
    });
    console.log("Завершение функции clearBoard");
}




function loadDrawingForCurrentLevel() {
    const levelId = currentLevel;
    console.log("Запуск функции loadDrawingForCurrentLevel с ID уровня:", levelId);

    const levelRef = database.ref(`games/${gameId}/levels/${levelId}/cells`);
    levelRef.off('value');

    levelRef.once('value').then(snapshot => {
        const cells = snapshot.val() || {};
        console.log(`Получены данные для уровня ${levelId} из loadDrawingForCurrentLevel:`, cells);
        displayBoard(cells);
        updateTaskPanel();
        console.log("Завершение функции loadDrawingForCurrentLevel");
    }).catch(error => {
        console.error("Ошибка в функции loadDrawingForCurrentLevel:", error);
    });
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
function checkScrollRequired() {
    const taskCoordinates = document.getElementById('taskCoordinates');

    // Проверяем, нужна ли тень слева
    if (taskCoordinates.scrollLeft > 0) {
        taskCoordinates.classList.add('scrolling-required-left');
    } else {
        taskCoordinates.classList.remove('scrolling-required-left');
    }

    // Проверяем, нужна ли тень справа
  if (taskCoordinates.scrollLeft + taskCoordinates.clientWidth + 1 < taskCoordinates.scrollWidth) {

        taskCoordinates.classList.add('scrolling-required-right');
    } else {
        taskCoordinates.classList.remove('scrolling-required-right');
    }
}





// Вызывайте эту функцию при загрузке страницы и при любых изменениях размера окна.
window.addEventListener('load', function() {
    setTimeout(checkScrollRequired, 1500); // задержка в 100 миллисекунд
});
window.addEventListener('resize', checkScrollRequired);
taskCoordinates.addEventListener('scroll', checkScrollRequired);


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
            console.error("Ошибка: ячейки отсутствуют в исходных данных!");
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




async function fetchCellsFromFirebase(ref) {
    console.log("fetchCellsFromFirebase начала работу");
    try {
        let data = await ref.once('value').then(snap => snap.val());
        console.log("fetchCellsFromFirebase получила данные:", data);
        return data;
    } catch (error) {
        console.error("Ошибка в fetchCellsFromFirebase:", error);
        return null;
    }
}


