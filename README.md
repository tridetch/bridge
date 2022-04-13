# The bridge

Требования

- Функция swap(): списывает токены с пользователя и испускает event ‘swapInitialized’
- Функция redeem(): вызывает функцию ecrecover и восстанавливает по хэшированному сообщению и сигнатуре адрес валидатора, если адрес совпадает с адресом указанным на контракте моста то пользователю отправляются токены

[Rinkeby bridge contract](https://rinkeby.etherscan.io/address/0x547D671dED5D0A79870357d17838DA1c390d7C45)
[Ropsten bridge contract](https://ropsten.etherscan.io/address/0x3DfC44c7aD14711dAfB70a9bEaD10e4756980d9B)

После выполнения таски bridgeSwap в папке ./tasks/swap_receipts создастся файл со всеми необходимыми данными дял вызова таски redeem.