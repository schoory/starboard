
import { useState, useEffect, useReducer, useRef } from 'react'
import { Checkbox, Typography, Tooltip, Button, SvgIcon, Autocomplete, TextField, InputAdornment, MenuItem, Popover } from '@mui/material'
import { format } from 'date-fns'
import './Stargrid.css'

import useMediaQuery from '@mui/material/useMediaQuery';

export const Stargrid = (props) => {

  // ? колонки таблицы
  const [columns, setColumns] = useState([])

  // ? строки данных таблицы
  const [rows, setRows] = useState([])
  const [allRows, setAllRows] = useState([])

  // ? сортировка
  const [sort, setSort] = useState({ field: '', type: 'none' })

  // ? поиск
  const [search, setSearch] = useState('')

  // ? фильтр данных
  const [filter, setFilter] = useState({ 
    visible: false, anchor: null, field: '', action: '',
    value: '', fields: [], actions: []
  })

  // ? страницы таблицы 
  const [pages, setPages] = useState({ 
    maxRows: 25, maxPages: 1, current: 1
  })

  // ? все значения выбраны
  const [allChecked, setAllChecked] = useState(false)

  // ? выбранный способ отображения (фильтрация, все)
  const [actionActive, setActionActive] = useState('all')

  const mdScreen = useMediaQuery('(max-width: 1280px)')
  const smScreen = useMediaQuery('(max-width: 600px)')

  // * установка колонок, возможных полей для фильтрации при изменении пропса
  useEffect(() => {
    if (props.columns && props.columns.length > 0) {
      setColumns(props.columns)

      // ? установка полей, по которым может производиться фильтрация
      const fields = props.columns.reduce((value, item) => { 
        if (item.label) {
          value.push({ name: item.name, value: item.label })
        }
        return value
      }, [])

      // ? возможные фильтры
      const actions = [
        { name: '=', value: 'равно' },
        { name: '><', value: 'содержит' },
        { name: '!><', value: 'несодержит' },
        { name: '>', value: 'больше' },
        { name: '<', value: 'меньше' },
        { name: '>=', value: 'больше или равно' },
        { name: '<=', value: 'меньше или равно' },
        { name: '!=', value: 'неравно' }
      ]
      
      setFilter({ ...filter, fields: fields, actions: actions })
    }
  }, [props.columns])

  // * установка строк при изменении пропса
  useEffect(() => {
    if (props.rows) {
      
      const maxPages = Math.ceil(props.rows.length / pages.maxRows)
      
      setPages({ ...pages, maxPages: maxPages > 0 ? maxPages : 0 })
      
      setRows(props.rows)
      setAllRows(props.rows)
    }
  }, [props.rows])

  // * нажатие на кнопку просмотра
  const handleViewClick = (event, id) => {
    if (props.onViewClick) {
      props.onViewClick(id ? id : event.currentTarget.parentNode.id)
    }
  }

  // * нажатие на кнопку документов
  const handleDocumentsClick = (event) => {
    if (props.onDocumentsClick) {
      props.onDocumentsClick(event.currentTarget.parentNode.id)
    }
  }

  // * нажатие на кнопку сообщений
  const handleMessageClick = (event) => {
    if (props.onMessageClick) {
      props.onMessageClick(event.currentTarget.parentNode.id)
    }
  }

  // @ выбор строк

  // * все строки выбраны
  const handleAllValueChecked = (event) => {
    const checkColumn = columns.find(column => column.name === event.target.parentNode.getAttribute('data-column-name'))
    checkColumn.checked = !checkColumn.checked
    setAllChecked(checkColumn.checked)
    rows.map(row => {
      row[checkColumn.name].value = checkColumn.checked
    })
  }

  // * выбор строки
  const handleValueChecked = ({ currentTarget: { id } }) => {

    let cRows = [ ...rows ]

    const cRow = cRows.find(row => Object.keys(row).find(item => row[item].type === 'index' && row[item].value === id))
    const cKey = Object.keys(cRow).find(item => cRow[item].type === 'boolean')
    cRow[cKey].value = !cRow[cKey].value

    setRows(cRows)
    
  }

  // @ выбор страниц для отображения

  // * предыдущая страница
  const handlePageDecrement = () => {
    if (pages.current - 1 < 1) {
      return 
    } else {
      setPages({ ...pages, current: pages.current - 1 })
    }
  }
  
  // * следующая страница
  const handlePageInrement = () => {
    if (pages.current + 1 > pages.maxPages) {
      return 
    } else {
      setPages({ ...pages, current: pages.current + 1 })
    }
  }

  // @ сортировка, поиск, фильтрация

  // * сортировка
  const handleSort = (prev, current, column, type) => {
    if (type === 'asc') {
      if (prev[column].value < current[column].value) return 1
      if (prev[column].value > current[column].value) return -1
      return 0
    } else {
      if (prev[column].value < current[column].value) return -1
      if (prev[column].value > current[column].value) return 1
      return 0
    }
  }

  // * сортировка при нажатии на колонку
  const handleHeaderClick = ({ currentTarget }) => {

    let cRows = [ ...rows ]
    const column = currentTarget.getAttribute('data-column-name')

    switch (sort.type) {
      case 'none':
        cRows = cRows.sort((a, b) => handleSort(a, b, column, 'asc'))
        setSort({ type: 'asc', field: column })
        break

      case 'asc':
        if (column === sort.field) {
          cRows = cRows.sort((a, b) => handleSort(a, b, column, 'desc'))
          setSort({ type: 'desc', field: column })
        } else {
          cRows = cRows.sort((a, b) => handleSort(a, b, column, 'asc'))
          setSort({ type: 'asc', field: column })
        }
        break

      case 'desc':
        cRows = cRows.sort((a, b) => handleSort(a, b, column, 'asc'))
        setSort({ type: 'asc', field: column })
        break
    
      default:
        break;
    }

    setRows(cRows)
  }

  // * поиск
  const handleSearch = (event) => {

    if (event.key === 'Enter') {
      
      const sRows = allRows.filter(row => 
        Object.keys(row).find(key =>
          ['string', 'index', 'date', 'money'].includes(row[key].type) && row[key].value && row[key].value.toString().toLowerCase().indexOf(search.toLowerCase()) != -1
        )
      )

      setRows(sRows)
    }

  }
  
  // * применяется фильтр
  const handleSetFilter = () => {
    if (filter.field && filter.action) {

      let fRows = new Array()

      const value = filter.value

      switch (filter.action.name) {
        case '=':
          fRows = allRows.filter(row => 
            row[filter.field.name].type === 'date' ? 
              new Date(row[filter.field.name].value).toLocaleDateString() === new Date(value.replace(/\./g, '-').split('-').reverse().join('-')).toLocaleDateString() :
              row[filter.field.name].value === value
          )
          break
        case '>=':
          fRows = allRows.filter(row => 
            row[filter.field.name].type === 'date' ? 
              new Date(row[filter.field.name].value).toLocaleDateString() >= new Date(value.replace(/\./g, '-').split('-').reverse().join('-')).toLocaleDateString() :
              row[filter.field.name].value >= value
          )
          break
        case '<=':
          fRows = allRows.filter(row => 
            row[filter.field.name].type === 'date' ? 
              new Date(row[filter.field.name].value).toLocaleDateString() <= new Date(value.replace(/\./g, '-').split('-').reverse().join('-')).toLocaleDateString() :
              row[filter.field.name].value <= value
          )
          break
        case '>':
          fRows = allRows.filter(row => 
            row[filter.field.name].type === 'date' ? 
              new Date(row[filter.field.name].value).toLocaleDateString() > new Date(value.replace(/\./g, '-').split('-').reverse().join('-')).toLocaleDateString() :
              row[filter.field.name].value > value
          )
          break
        case '<':
          fRows = allRows.filter(row => 
            row[filter.field.name].type === 'date' ? 
              new Date(row[filter.field.name].value).toLocaleDateString() < new Date(value.replace(/\./g, '-').split('-').reverse().join('-')).toLocaleDateString() :
              row[filter.field.name].value < value
          )
          break
        case '!=':
          fRows = allRows.filter(row => 
            row[filter.field.name].type === 'date' ? 
              new Date(row[filter.field.name].value).toLocaleDateString() !== new Date(value.replace(/\./g, '-').split('-').reverse().join('-')).toLocaleDateString() :
              row[filter.field.name].value !== value
          )
          break
        case '><': 
        fRows = allRows.filter(row => 
          row[filter.field.name].type === 'date' ? 
            new Date(row[filter.field.name].value).toLocaleDateString().indexOf(value) :
            row[filter.field.name].value.indexOf(value) !== -1
          )
          break
        case '!><': 
        fRows = allRows.filter(row => 
          row[filter.field.name].type === 'date' ? 
            new Date(row[filter.field.name].value).toLocaleDateString().indexOf(value) :
            row[filter.field.name].value.indexOf(value) === -1
          )
          break
        default:
          break
      }
      
      setRows(fRows)
      setActionActive('filter')
    }
  }

  // * очистка фильтра
  const handleClearAction = (event) => {
    setRows(allRows)
    setSort({ type: 'none', field: '' })
    setActionActive(event.target.getAttribute('data-action'))
  }

  const handleStyles = () => {
    if (rows.length === 0) {
      return {
        gridTemplateColumns: `repeat(${columns.length - columns.filter(item => item.visible === false).length}, minmax(50px, auto))`,
        gridTemplateAreas: "'a a a a a a a a a' 'empty empty empty empty empty empty empty empty empty'"
      }
    }

    if (smScreen) {
      return { gridTemplateColumns: `50px ${'1fr '.repeat(columns.filter(item => item.type === 'title').length)}` }
    }

    if (mdScreen && columns.length > 7) {
      return { gridTemplateColumns: `50px ${'1fr '.repeat(columns.filter(item => item.type === 'title').length)} ${columns.find(item => item.type === 'controls') ? 'calc(128px + 1.5rem)' : ''}` }
    }

    return { gridTemplateColumns: `repeat(${columns.length - columns.filter(item => item.visible === false).length}, minmax(50px, auto))` }
  }

  // * отображение колонок
  const renderHeaders = () => {
    if (columns.length > 0) {
      
      const headers = []

      if (smScreen) {
        columns.forEach((column, index) => {
          switch (column.type) {
            case 'boolean':
              headers.push(
                <Checkbox 
                  label={ column.label } 
                  data-column-name={ column.name } 
                  key={index} 
                  checked={allChecked}
                  className={ 
                    allChecked ? 
                    "stargrid__header stargrid__header-checkbox stargrid__header-checkbox_active" : 
                    "stargrid__header stargrid__header-checkbox" 
                  }
                  onChange={handleAllValueChecked} 
                /> 
              )
              break
            case 'title':
                headers.push(
                  <div 
                    data-column-name={ column.name }
                    key={index}
                    className="stargrid__header stargrid__header_clickable"
                    onClick={handleHeaderClick}
                  >
                    <Tooltip title={column.label}>
                      <Typography noWrap>
                        {column.label}
                      </Typography>
                    </Tooltip>
                    {
                      sort.type !== 'none' && sort.field === column.name ? 
                        sort.type === 'desc' ? 
                          <Tooltip title='Отсортировано по возрастанию'>
                            <SvgIcon><path fill="currentColor" d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z" /></SvgIcon>
                          </Tooltip> :
                          <Tooltip title='Отсортировано по убыванию'>
                            <SvgIcon><path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" /></SvgIcon>
                          </Tooltip>
                          
                      : <></>
                    }
                  </div>
                )
              break
            default:
              break;
          }
        })
        return headers
      }

      if (mdScreen && columns.length > 7) {
        
        columns.forEach((column, index) => {
          switch (column.type) {
            case 'boolean':
              headers.push(
                <Checkbox 
                  label={ column.label } 
                  data-column-name={ column.name } 
                  key={index} 
                  checked={allChecked}
                  className={ 
                    allChecked ? 
                    "stargrid__header stargrid__header-checkbox stargrid__header-checkbox_active" : 
                    "stargrid__header stargrid__header-checkbox" 
                  }
                  onChange={handleAllValueChecked} 
                /> 
              )
              break
            case 'title':
                headers.push(
                  <div 
                    data-column-name={ column.name }
                    key={index}
                    className="stargrid__header stargrid__header_clickable"
                    onClick={handleHeaderClick}
                  >
                    <Tooltip title={column.label}>
                      <Typography noWrap>
                        {column.label}
                      </Typography>
                    </Tooltip>
                    {
                      sort.type !== 'none' && sort.field === column.name ? 
                        sort.type === 'desc' ? 
                          <Tooltip title='Отсортировано по возрастанию'>
                            <SvgIcon><path fill="currentColor" d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z" /></SvgIcon>
                          </Tooltip> :
                          <Tooltip title='Отсортировано по убыванию'>
                            <SvgIcon><path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" /></SvgIcon>
                          </Tooltip>
                          
                      : <></>
                    }
                  </div>
                )
              break
            case 'controls':
              headers.push(
                <div
                  className='stargrid__header'
                  data-column-name={ column.name }
                  key={index}
                />
              )
              break
            default:
              break;
          }
        })

        return headers

      }

      columns.map((column, index) => {
        switch (column.type) {
          case 'boolean':
            headers.push(
              <Checkbox 
                label={ column.label } 
                data-column-name={ column.name } 
                key={index} 
                checked={allChecked}
                className={ 
                  allChecked ? 
                  "stargrid__header stargrid__header-checkbox stargrid__header-checkbox_active" : 
                  "stargrid__header stargrid__header-checkbox" 
                }
                onChange={handleAllValueChecked} 
              /> 
            )
            break
          case 'title':
          case 'string':
          case 'money':
          case 'date':
          case 'index': 
            if (column.visible !== false) {
              headers.push(
                <div 
                  data-column-name={ column.name }
                  key={index}
                  className="stargrid__header stargrid__header_clickable"
                  onClick={handleHeaderClick}
                >
                  <Tooltip title={column.label}>
                    <Typography noWrap>
                      {column.label}
                    </Typography>
                  </Tooltip>
                  {
                    sort.type !== 'none' && sort.field === column.name ? 
                      sort.type === 'desc' ? 
                        <Tooltip title='Отсортировано по возрастанию'>
                          <SvgIcon><path fill="currentColor" d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z" /></SvgIcon>
                        </Tooltip> :
                        <Tooltip title='Отсортировано по убыванию'>
                          <SvgIcon><path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" /></SvgIcon>
                        </Tooltip>
                        
                    : <></>
                  }
                </div>
              )
            }
            break
          case 'controls':
            headers.push(
              <div
                className='stargrid__header'
                data-column-name={ column.name }
                key={index}
              />
            )
            break
          default:
            break;
        }
      })

      return headers
    } else {
      <div>EMPTY</div>
    }
  }

  // * отображение строк
  const renderRows = () => {
    if (rows.length === 0) {
      return <p>Нет записей</p>
    } else {
      const data = []

      if (smScreen) {
        rows.forEach((row, index) => {

          if (index > pages.maxRows * pages.current - 1) {
            return 
          } 
          if (pages.current > 1 && index < pages.maxRows * (pages.current - 1)) {
            return
          }
  
          const idKey = Object.keys(row).find(key => row[key].type === 'index')
          const id = row[idKey].value
  
          Object.keys(row).forEach((key, keyIndex) => {
            switch (row[key].type) {
              case 'boolean':
                data.push(
                  <Checkbox
                    className={ 
                      row[key].value ? 
                        "stargrid__cell stargrid__cell-checkbox stargrid__cell-checkbox_active" : 
                        "stargrid__cell stargrid__cell-checkbox"
                    }
                    label={row[key].label}
                    id={id}
                    data-column-name={key}
                    key={index.toString() + keyIndex.toString()}
                    checked={ row[key].value }
                    onChange={handleValueChecked}
                  />
                )
                break;
              case 'title':
                data.push(
                  <div 
                    className="stargrid__cell"
                    data-column-name={key}
                    key={index.toString() + keyIndex.toString()}
                    data-id={id}
                    onClick={(event) => { handleViewClick(event, event.currentTarget.getAttribute('data-id')) }}
                  >
                    <Tooltip title={row[key].value}>
                      <Typography noWrap>
                        {row[key].value}
                      </Typography>
                    </Tooltip>
                  </div>
                )
                break
              default:
                break
            }
          })
        })

        return data
      }

      if (mdScreen && columns.length > 7) {

        rows.map((row, index) => {

          if (index > pages.maxRows * pages.current - 1) {
            return 
          } 
          if (pages.current > 1 && index < pages.maxRows * (pages.current - 1)) {
            return
          }
  
          const idKey = Object.keys(row).find(key => row[key].type === 'index')
          const id = row[idKey].value
  
          Object.keys(row).forEach((key, keyIndex) => {
            switch (row[key].type) {
              case 'boolean':
                data.push(
                  <Checkbox
                    className={ 
                      row[key].value ? 
                        "stargrid__cell stargrid__cell-checkbox stargrid__cell-checkbox_active" : 
                        "stargrid__cell stargrid__cell-checkbox"
                    }
                    label={row[key].label}
                    id={id}
                    data-column-name={key}
                    key={index.toString() + keyIndex.toString()}
                    checked={ row[key].value }
                    onChange={handleValueChecked}
                  />
                )
                break;
              case 'title':
                data.push(
                  <div 
                    className="stargrid__cell"
                    data-column-name={key}
                    key={index.toString() + keyIndex.toString()}
                  >
                    <Tooltip title={row[key].value}>
                      <Typography noWrap>
                        {row[key].value}
                      </Typography>
                    </Tooltip>
                  </div>
                )
                break
              case 'controls': 
                data.push(
                  <div 
                    className="stargrid__cell stargrid__cell-controls"
                    data-column-name={key}
                    key={index.toString() + keyIndex.toString()}
                    id={id}
                  >
                    {
                      row[key].value.includes('view') ? 
                        <Button disableElevation className='stargrid__cell-btn' onClick={handleViewClick}>
                          <SvgIcon>
                            <path fill="currentColor" d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C15.76,17.5 19.17,15.36 20.82,12C19.17,8.64 15.76,6.5 12,6.5C8.24,6.5 4.83,8.64 3.18,12Z" />
                          </SvgIcon>
                        </Button> :
                        <></>
                    }
                    {
                      row[key].value.includes('documents') ? 
                        <Button disableElevation className='stargrid__cell-btn' onClick={handleDocumentsClick}>
                          <SvgIcon>
                            <path fill="currentColor" d="M14,2L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2H14M18,20V9H13V4H6V20H18M12,19L8,15H10.5V12H13.5V15H16L12,19Z" />
                          </SvgIcon>
                        </Button> :
                        <></>
                    }
                    {
                      row[key].value.includes('message') ? 
                        <Button disableElevation className='stargrid__cell-btn' onClick={handleMessageClick}>
                          <SvgIcon>
                            <path fill="currentColor" d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6M20 6L12 11L4 6H20M20 18H4V8L12 13L20 8V18Z" />
                          </SvgIcon>
                        </Button> :
                        <></>
                    }
                  </div>
                )
                break
              default:
  
                break;
            }
          })
        })

      } else {

        rows.map((row, index) => {

          if (index > pages.maxRows * pages.current - 1) {
            return 
          } 
          if (pages.current > 1 && index < pages.maxRows * (pages.current - 1)) {
            return
          }
  
          const idKey = Object.keys(row).find(key => row[key].type === 'index')
          const id = row[idKey].value
  
          Object.keys(row).map((key, keyIndex) => {
            switch (row[key].type) {
              case 'boolean':
                data.push(
                  <Checkbox
                    className={ 
                      row[key].value ? 
                        "stargrid__cell stargrid__cell-checkbox stargrid__cell-checkbox_active" : 
                        "stargrid__cell stargrid__cell-checkbox"
                    }
                    label={row[key].label}
                    id={id}
                    data-column-name={key}
                    key={index.toString() + keyIndex.toString()}
                    checked={ row[key].value }
                    onChange={handleValueChecked}
                  />
                )
                break;
              case 'index':
              case 'title':
              case 'string': 
                if (row[key].visible !== false) {
                  data.push(
                    <div 
                      className="stargrid__cell"
                      data-column-name={key}
                      key={index.toString() + keyIndex.toString()}
                    >
                      <Tooltip title={row[key].value}>
                        <Typography noWrap>
                          {row[key].value}
                        </Typography>
                      </Tooltip>
                    </div>
                  )
                }
                break;
              case 'money': 
                data.push(
                  <div 
                    className="stargrid__cell"
                    data-column-name={key}
                    key={index.toString() + keyIndex.toString()}
                  >
                    <Tooltip title={row[key].prefix + ' ' + row[key].value }>
                      <Typography noWrap>
                        {row[key].prefix + ' ' + row[key].value }
                      </Typography>
                    </Tooltip>
                  </div>
                )
                break
              case 'date': 
                data.push(
                  <div 
                    className="stargrid__cell"
                    data-column-name={key}
                    key={index.toString() + keyIndex.toString()}
                  >
                    <Tooltip title={row[key].value ? new Date(row[key].value).toLocaleDateString() : 'Никогда' }>
                      <Typography noWrap>
                        {row[key].value ? new Date(row[key].value).toLocaleDateString() : 'Никогда' }
                      </Typography>
                    </Tooltip>
                  </div>
                )
                break
              case 'controls': 
                data.push(
                  <div 
                    className="stargrid__cell stargrid__cell-controls"
                    data-column-name={key}
                    key={index.toString() + keyIndex.toString()}
                    id={id}
                  >
                    {
                      row[key].value.includes('view') ? 
                        <Button disableElevation className='stargrid__cell-btn' onClick={handleViewClick}>
                          <SvgIcon>
                            <path fill="currentColor" d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C15.76,17.5 19.17,15.36 20.82,12C19.17,8.64 15.76,6.5 12,6.5C8.24,6.5 4.83,8.64 3.18,12Z" />
                          </SvgIcon>
                        </Button> :
                        <></>
                    }
                    {
                      row[key].value.includes('documents') ? 
                        <Button disableElevation className='stargrid__cell-btn' onClick={handleDocumentsClick}>
                          <SvgIcon>
                            <path fill="currentColor" d="M14,2L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2H14M18,20V9H13V4H6V20H18M12,19L8,15H10.5V12H13.5V15H16L12,19Z" />
                          </SvgIcon>
                        </Button> :
                        <></>
                    }
                    {
                      row[key].value.includes('message') ? 
                        <Button disableElevation className='stargrid__cell-btn' onClick={handleMessageClick}>
                          <SvgIcon>
                            <path fill="currentColor" d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6M20 6L12 11L4 6H20M20 18H4V8L12 13L20 8V18Z" />
                          </SvgIcon>
                        </Button> :
                        <></>
                    }
                  </div>
                )
                break
              default:
  
                break;
            }
          })
        })

      }
      
      return data
    }
  }

  return (
    <div className={ props.className ? `stargrid ${props.className}` : 'stargrid'}>
      <div className="stargrid__grid">
        <div className="stargrid__actions">
          <div className={ actionActive === 'all' ? "stargrid__action stargrid__action_active stargrid__action_all" : "stargrid__action stargrid__action_all"}>
            <Button type='text' onClick={handleClearAction} data-action='all'>Все</Button>
          </div>
          <div className={ actionActive === 'search' ? "stargrid__action stargrid__action_active stargrid__action_search" : "stargrid__action stargrid__action_search"}>
            <TextField 
              variant='standard'
              placeholder='Поиск'
              data-action='search'
              value={search}
              onChange={(event) => { setSearch(event.target.value) }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SvgIcon>
                      <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
                    </SvgIcon>
                  </InputAdornment>
                ),
              }}
              onKeyPress={handleSearch}
            />
          </div>
          <div className={ actionActive === 'filter' ? "stargrid__action stargrid__action_active stargrid__action_filter" : "stargrid__action stargrid__action_filter"}>
            <Button onClick={ ({ currentTarget }) => { setFilter({ ...filter, visible: true, anchor: currentTarget, field: filter.fields[0] ? filter.fields[0] : '', action: filter.actions[0] ? filter.actions[0] : '' }) }}>Фильтр</Button>
          </div>
        </div>
        <div className="stargrid__wrapper">
          <div 
            className={ rows.length === 0 ? "stargrid__list stargrid__list_empty" : "stargrid__list"} 
            style={
              handleStyles()
            } 
          >
            {
              renderHeaders()
            }
            {
              renderRows()
            }
          </div>
        </div>
        <div className="stargrid__pagination">
          <Button className='stargrid__pagebtn' onClick={handlePageDecrement}>
            <SvgIcon>
              <path fill="currentColor" d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />
            </SvgIcon>
          </Button>
          <p className='stargrid__page'>{ pages.current }/{ pages.maxPages }</p>
          <Button className='stargrid__pagebtn' onClick={handlePageInrement}>
            <SvgIcon>
              <path fill="currentColor" d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
            </SvgIcon>
          </Button>
        </div>
      </div>

      {/* POPOVERS */}

      <Popover
        open={filter.visible}
        onClose={() => { 
          setFilter({ ...filter, visible: false, anchor: null, field: filter.fields[0] ? filter.fields[0] : '', action: filter.actions[0] ? filter.actions[0] : '', value: '' }) 
        }}
        anchorEl={filter.anchor}
      >
        <div className="filter">
          <div className="filter__row">

            <Autocomplete
              options={filter.fields}
              getOptionLabel={option => option.value ? option.value : ''}
              isOptionEqualToValue={(option, value) => option.name === value.name}
              value={filter.field}
              disableClearable
              onChange={(event, value) => { setFilter({ ...filter, field: value }) }}
              renderInput={(params) => (
                <TextField {...params} className='filter__input' />
              )}
            />

            <Autocomplete
              options={filter.actions}
              getOptionLabel={option => option.value}
              isOptionEqualToValue={(option, value) => option.name === value.name}
              value={filter.action}
              disableClearable
              onChange={(event, value) => { setFilter({ ...filter, action: value }) }}
              renderInput={(params) => (
                <TextField {...params} className='filter__input' />
              )}
            />

            <TextField className="filter__input" value={filter.value} onChange={ ({ target: { value } }) => { setFilter({ ...filter, value: value }) } }/>
          </div>
          <div className="filter__actions">
            <Button disableRipple className='stargrid__btn stargrid__btn_fullWidth' onClick={handleClearAction} data-action='all'>Отменить</Button>
            <Button disableRipple className='stargrid__btn stargrid__btn_fullWidth' onClick={handleSetFilter}>Применить</Button>
          </div>
        </div>
      </Popover>

      {/* /POPOVERS */}

    </div>
  )
}