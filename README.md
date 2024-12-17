# cubicjs

сайт: https://meex.lol/cubic/

## роадмап

- пакет на отправку позиции от клиента
- пакет на отправку текста на экран от сервера

## протокол

работает через вебсокеты \
дефолтный порт 8000

булевые значения пишутся как 0 и 1 \
в нике не должны быть пробелы \
установка - добавление / изменение

чтобы подключиться к серверу, \
нужно отправить пакет J, затем \
все пакеты произвольные

### формат пакетов
первый символ - тип пакета \
остальное - данные пакета, параметры через \n (перенос строки) \
пример пакета отправки мира:
```
 "WB10,0,1,normal,#fff\nP1name,0,1,0,0,#d00"
  🠅└─┬───────────────┘  └┬────────────────┘
тип  параметр (блок)     параметр (игрок)
```

### список пакетов
{данные} - типа это какието данные так обозначаю, скобки не надо \
[C] - айди пакета

**клиент отправляет:**
```
заход игрока                        [J]: {ник_игрока}
отправить velocity                  [V]: {vel_x}, {vel_y}
установить блок                     [P]: {x}, {y}, {тип}
сломать блок                        [D]: {x}, {y}
нажатие кнопки (список кнопок ниже) [K]: {кнопка}, {нажата ли}
отправить сообщение                 [M]: {сообщение}
```

**сервер отправляет:**
```
кикнуть игрока с ошибкой        [K]: {ошибка}
установить цвета игроку         [C]: {цвет}
установить ник игрока           [N]: {ник}
установить позицию игрока       [P]: {x}, {y}
установить velocity игрока      [V]: {x}, {y}
установить walk speed игрока    [S]: "W", {скорость}
установить jump speed игрока    [S]: "J", {скорость}
установить gravity speed игрока [S]: "G", {скорость}
отправить мир                   [W]: {изм. мира}, {изм. мира}, ...
отправить все типы блоков:      [B]: {тип_1}, ..., {тип_9}
отправить сообщение             [M]: {сообщение}, {сообщение}, ...
корректировка движение          [R]: {x}, {y}, {vel_x}, {vel_y}
```

**список кнопок которые может отправить игрок через отдельный пакет:**
```
["KeyR", "KeyW", "KeyE", "KeyQ", "KeyS", "KeyZ", "KeyX", "KeyC"
"Numpad1", "Numpad2", "Numpad3", "Numpad4", "Numpad5",
"Numpad6", "Numpad7", "Numpad8", "Numpad9", "Numpad0",
"ShiftLeft", "ControlLeft", "Enter", "F1", "F2"]
```

**формат изменения мира:** \
установка блока: "B1{x},{y},{collides},{type},{color}" \
установка игрока: "P1{name},{x},{y},{vel_x},{vel_y},{color}"\
удаление блока: "B0{x},{y}" \
удаление игрока: "P0{name}"