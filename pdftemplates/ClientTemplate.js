

module.exports = (client, directors, shareholders, mainContact) => {
  let summary = 0
  shareholders.map(shareholder => {
    summary += +shareholder.numOfShares
  })
  return (`
  <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Client information</title>
  <style>
    * {
      box-sizing: border-box;
    }
    .header {
      text-align: end;
      padding: 1rem;
      color: #C6C3B5;
      font-family: sans-serif;
      font-size: 14px;
      font-weight: 400;
      margin-bottom: 3rem;
    }
    .header__title {
      margin-bottom: .2rem;
    }
    .main {
      color: #252A34;
      font-family: sans-serif;
    }
    .main__title {
      text-align: center;
      font-weight: 500;
      font-size: 28px;
      margin-bottom: 1rem;
    }
    .main__subtitle {
      font-size: 18px;
      font-weight: 400;
      text-align: center;
      margin-bottom: 4rem;
    }
    .main__content {
      margin: 0 auto;
      border-top: 1px solid #EAEAEA;
      border-bottom: 1px solid #EAEAEA;
      padding: 2.5rem 1rem 0rem 1rem;
      width: 625px;
      margin-bottom: 2rem;
    }
    .main__label, .main__h > th {
      color: #6c6e6d;
      font-weight: 400;
      font-size: 14px;
      margin-bottom: .5rem;
    }
    .main__value, .main__r > td {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 1.5rem;
    }
    .main__item {
      width: 100%;
      margin-bottom: 1.5rem;
    }
    .main__item:last-child {
      margin-bottom: 0;
    }
    .main__item_2 {
      grid-template-columns: repeat(2, 1fr);
    }
    .main__item_subitem {
      padding: 0rem 1rem;
      margin-bottom: 2.5rem;
    }
    .main__item > .main__value {
      margin: 0;
    }
    .main__directors, .main__shareholders {
      margin: 0 auto;
      width: 765px;
      margin-bottom: 2rem;
    }
    .main__dirtitle, .main__sharetitle {
      font-size: 18px;
      margin-bottom: 1.5rem;
      padding: 0 1rem;
    }
    .main__table {
      border-collapse: collapse;
      margin-bottom: 4rem;
      width: 100%;
    }
    .main__thead {
      border-bottom: .5rem solid transparent;
    }
    .main__h > th, .main__r > td {
      text-align: left;
    }
    .main__table_subitem .main__h > th, .main__table_subitem .main__r > td{
      padding: 0rem 1rem;
    }
    .main__header {
      padding: .5rem 1rem;
      border-bottom: 1px solid #EAEAEA;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
    }
    .main__header_share {
      grid-template-columns: 300px 300px 200px 70px;
    }
    .main__row {
      padding: .5rem 1rem;
      background: #fcfcfc;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
    }
    .main__row_share {
      grid-template-columns: 300px 300px 200px 70px;
    }
    .main__table-cell > th, .main__table-cell > td {
      font-weight: 400 !important;
      font-size: 14px !important;
    }
    .main__table-cell {
      border-bottom: 1rem solid transparent
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header__title">Starboard</div>
    <div class="header__date">Дата создания: ${new Date().toLocaleDateString()}</div>
  </div>
  <div class="main">
    <div class="main__title">${client.clientName}</div>
    <div class="main__subtitle">${client.email}</div>
    <div class="main__content">
      <div class="main__label">Адрес регистрации</div>
      <div class="main__value">${client.registeredAddress}</div>
      <div class="main__label">Статус клиента</div>
      <div class="main__value">${client.clientStatus}</div>
      <div class="main__label">Контактное лицо</div>
      <div class="main__value">${mainContact.firstName} ${mainContact.lastName}</div>
      <table class="main__table main__table_subitem">
        <thead class="main__thead">
          <tr class="main__h">
            <th>Электронная почта</th>
            <th>Номер телефона</th>
          </tr>
        </thead>
        <tr class="main__r">
          <td>${mainContact.email}</td>
          <td>${mainContact.phoneNumber}</td>
        </tr>
      </table>
      <table class="main__table">
        <thead class="main__thead">
          <tr class="main__h">
            <th>ИНН</th>
            <th>Статус ИНН</th>
            <th>Дата постановки</th>
          </tr>
        </thead>
        <tr class="main__r">
          <td>${client.UEN}</td>
          <td>${client.UENStatus}</td>
          <td>${client.UENDate ? client.UENDate.toLocaleDateString() : 'Нет информации'}</td>
        </tr>
      </table>
      <table class="main__table">
        <thead class="main__thead">
          <tr class="main__h">
            <th>Оплаченный капитал</th>
            <th>Стоимость акции</th>
            <th>Количество акций</th>
          </tr>
        </thead>
        <tr class="main__r">
          <td>${client.capital}</td>
          <td>${client.shareCapital}</td>
          <td>${client.numOfShares}</td>
        </tr>
      </table>
      <table class="main__table">
        <thead class="main__thead">
          <tr class="main__h">
            <th>Последняя встреча совета директоров</th>
            <th>Последнее заполнение декларации</th>
          </tr>
        </thead>
        <tr class="main__r">
          <td>${client.lastAGM ? client.lastAGM.toLocaleDateString() : 'Никогда'}</td>
          <td>${client.lastARFilled ? client.lastARFilled.toLocaleDateString() : 'Никогда'}</td>
        </tr>
      </table>
    </div>
    <div class="main__directors">
      <div class="main__dirtitle">Директора</div>

      <table class="main__table main__table_subitem">
        <thead class="main__thead">
          <tr class="main__h main__table-cell">
            <th>Должность</th>
            <th>Имя</th>
            <th>Телефон</th>
            <th>Электронная почта</th>
          </tr>
        </thead> \n` +
          directors.map(director => (
            `
            <tr class="main__r main__table-cell">
              <td>${director.post}</td>
              <td>${director.firstName} ${director.lastName}</td>
              <td>${director.phoneNumber}</td>
              <td>${director.email}</td>
            </tr>
            `
          )) + `
      </table>
    <div class="main__shareholders">
      <div class="main__sharetitle">Акционеры</div>
      <table class="main__table main__table_subitem">
        <thead class="main__thead">
          <tr class="main__h main__table-cell">
            <th>Наименование/ФИО акционера</th>
            <th>Дата акционерного соглашения</th>
            <th>Количество акций</th>
            <th>%</th>
          </tr>
        </thead> \n` +
          shareholders.sort((a, b) => b.numOfShares - a.numOfShares).map(shareholder => (
            `
            <tr class="main__r main__table-cell">
              <td>${shareholder.name}</td>
              <td>${shareholder.shareholderDate ? shareholder.shareholderDate.toLocaleDateString() : 'Не указана'}</td>
              <td>${shareholder.numOfShares}</td>
              <td>${Math.round(shareholder.numOfShares / summary * 100)}%</td>
            </tr>
            `
          )) + `
      </table>
    </div>
  </div>
</body>
</html>
  `)
}