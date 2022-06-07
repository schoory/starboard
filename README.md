# Starboard
Приложение для аутсорсинговых компаний, предоставляющих бизнес-аналитику.
Стэк: NodeJS, express, React, MongoDB, multer, Material UI
___
## Установка
- Установите пакеты (`npm i`)
- Запустите dev-сервер (`npm run dev`)
- Перейдите на `localhost:3000`

Для предпросмотра возможностей приложения предусмотрены пользователи, данные для входа - `localhost:3000/about`.
___
## Приложение
Приложение подразумевает 2 сущности: **Клиенты** и **Компании**.

### Компания
Пользователи компании разделяются на обычных пользователей и администраторов. Администраторам доступно управление пользователями компании, добавление новых клиентов, управление данными клиента (документами, акционерами, директорами). Обычные пользователи также могут управлять данными клиента, но изменять могут только те данные, которые добавили сами.
Главная страница, на которую попадает пользователь относящийся к компании после регистрации:
![Company main page](https://user-images.githubusercontent.com/87199667/172190310-df708beb-4016-40f8-8d3a-1c6bb45e159e.png)
Перейдя на вкладку Клиенты пользователь попадает на страницу со списком всех клиентов компании.
![Company clients page](https://user-images.githubusercontent.com/87199667/172193134-098ec606-3ba1-4024-8a8c-9f30b4ba0da6.png)
Для просмотра дополнительной информации о клиенте пользователь может нажать на  ![Screenshot_5](https://user-images.githubusercontent.com/87199667/172195184-ce455e42-49a9-4bb1-88e5-d7052247163b.png), здесь он может сформировать файл с детальной информацией о пользователе или перейти на страницу клиента.
![Screenshot_4](https://user-images.githubusercontent.com/87199667/172196015-13c664e0-0db8-4cae-b706-f5ddce6065b0.png)
Пользователь может перейти напрямую к странице документов клиента нажав на ![Screenshot_6](https://user-images.githubusercontent.com/87199667/172196467-be5d77d0-5091-4742-a2c6-13a0d8b1a0e0.png) или написать сообщение пользователю указанному как контактное лицо клиента нажав на ![Screenshot_7](https://user-images.githubusercontent.com/87199667/172197081-3730c10b-1184-4a0a-acdb-e3719e54d677.png)
Добавление нового клиента производится засчет создания ссылки приглашения, перейдя по которой пользователь попадает на страницу создания клиента. Список приглашений клиентов отображается на главной странице компании. 
Форма создания ссылки приглашения клиента:
![Screenshot_3](https://user-images.githubusercontent.com/87199667/172193947-85ebb0e9-482f-40ae-b58b-6ec3e3811140.png)
На странице создания клиента также создается пользователь, но, если пользователь уже зарегистрирован, достаточно будет ввести данные пользователя, новый пользователь в таком случае не будет создан.
![Screenshot_8](https://user-images.githubusercontent.com/87199667/172198259-59fe24ed-577d-4dc9-b0c1-28ad414a12a9.png)
На странице Клиента осуществляется все управление клиентом. Здесь клиента можно отметить как неактивного, поместить его в архив, изменить данные о нем.
![Screenshot_9](https://user-images.githubusercontent.com/87199667/172200400-b2760bbd-9aef-4748-8d2b-13b86cb68337.png)
Вкладки Директора и Акционеры
![Screenshot_10](https://user-images.githubusercontent.com/87199667/172200948-b31d775c-a7a5-4b75-b960-88b75407d020.png)
![Screenshot_11](https://user-images.githubusercontent.com/87199667/172201060-f6edeb5c-9319-46b9-a972-f61333cda407.png)
Вкладка Документы и добавление документа
![Screenshot_12](https://user-images.githubusercontent.com/87199667/172204787-1a53fa12-8287-464a-8b5d-62dd3b8a9484.png)
![Screenshot_13](https://user-images.githubusercontent.com/87199667/172205008-c346acfb-7e70-4b3e-b6be-df6dbd121fd2.png)

На странице События пользователь может создать личное событие или относящееся к компании. Есть возможность напоминания о событии, пользователю придет уведомление в день события.
Если необходимо создать личное событие, поле Клиент должно быть пустым, и флаг "Открыть видимость для компании" не должен быть выставлен. При выборе клиента событие автоматически становится видимым для всех пользователей компании и клиента.
При выборе "Открыть видимость для компании" событие становится видимым для всех пользователей компании.
![Screenshot_14](https://user-images.githubusercontent.com/87199667/172206504-35516c4d-687f-4a3e-aa9e-44ba915e2f6a.png)
В левом столбце отображаются близжайшие события, под календарем отображаются события выбранного дня.
![Screenshot_16](https://user-images.githubusercontent.com/87199667/172208306-71e65f98-abf6-494a-9de0-61ff08f338d7.png)
Страница Сообщения - это встроенный простой чат между пользователями компании и их клиентами.
![Screenshot_17](https://user-images.githubusercontent.com/87199667/172209010-6b0bfc70-4ae5-463b-85db-b378a61c3eb5.png)
___
### Клиент
Пользователи клиента не подразделяются на роли, т.к. все пользователи - это директора фирмы клиента, а, значит, они должны иметь права администрирования. Однако контактное лицо считается главным среди администраторов, именно оно отправляет создает приглашения для присоединения нового директора и может удалить пользователя из списка директоров фирмы.
Клиент имеет точно такие же возможности редактирования самого себя как и Компания.
![Screenshot_18](https://user-images.githubusercontent.com/87199667/172213443-c8c1c838-8ae1-407b-8587-62487a7cc227.png)
Вкладка Документы
![Screenshot_19](https://user-images.githubusercontent.com/87199667/172213643-a100fc78-0869-4613-b359-b6cb4139eba0.png)
На вкладке События в добавлении события появляется маркер "Открыть видимость для обслуживающей компании"
![Screenshot_21](https://user-images.githubusercontent.com/87199667/172214216-57510ca5-1a8d-4579-b003-777e522f4d3e.png)
![Screenshot_20](https://user-images.githubusercontent.com/87199667/172213837-e59538da-2fe2-4b17-9602-06ec9e176b44.png)
Страница Сообщения
![Screenshot_22](https://user-images.githubusercontent.com/87199667/172214362-139d4756-8fd6-4b9d-b31f-242b443f8eba.png)
