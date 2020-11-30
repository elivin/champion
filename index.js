(async () => {
  const fileData = await (await fetch('https://cdn.jsdelivr.net/gh/oprotono/champion@main/buildData.json')).json()

  let MY_MAP;
  let CURRENT_CITY_LIST = [];
  let CURRENT_CITY = 'Москва'
  let CURRENT_POINT = [];

  const yUrl = `https://geocode-maps.yandex.ru/1.x/?format=json&apikey=b49ab876-c9bf-4e92-8470-1edbef443540&geocode=`

  const data = fileData; // Данные с адресами
  const INFO_CARD =  document.getElementById('info-card');
  const INFO_CARDS_WRAP = document.getElementById('info-card__wrap');
  const FILTER_CARD = document.getElementById('filter-card');
  const FILTER_CARD_INPUT = document.getElementById('filter-card__input');
  const FILTER_CARD_INPUT_ERROR = document.getElementById('filter-card__input-error');
  const FILTER_CARD_ICON = document.getElementById('filter-card__icon');
  const FILTER_LIST = document.getElementById('filter-card__list');
  const FILTER_LIST_ITEMS = FILTER_LIST.querySelectorAll('.filter-card__list-item');
  const FILTER_LIST_ICONS = FILTER_LIST.querySelectorAll('.filter-card__check-icon');
  const BLOCKS = INFO_CARDS_WRAP.querySelectorAll('.info-card__block');
  const ADDRESSES = INFO_CARDS_WRAP.querySelectorAll('.info-card__street'); // Адресс точки продаж
  const CITIES = INFO_CARDS_WRAP.querySelectorAll('.info-card__city'); // Город

  // Дождёмся загрузки API и готовности DOM.
  ymaps.ready(init);

  function renderAddressesList(elem) {
    if (CURRENT_CITY_LIST.length === 0) return

    BLOCKS.forEach(item => item.classList.add('block-hidden'))

    let index = 0;
    let filterList = CURRENT_CITY_LIST;

    if (elem) {
      if (elem.cityName.toLowerCase() !== CURRENT_CITY.toLowerCase()) {
        CURRENT_CITY = elem.cityName
        findItems();
      }
      index = 1;
      renderFirstAddress(elem)

      if(CURRENT_CITY_LIST.length === 1) {
        return
      }

      filterList = CURRENT_CITY_LIST.filter(item => item !== elem)
    }

    let maxItems =  filterList.length < 3 ? filterList.length : 3;

    if (index > filterList.length) {
      return
    }

    for (let i = index; i < maxItems; i++) {
      const cityIndex = filterList[i] ? filterList[i].cityIndex : '';
      const cityName = filterList[i] ? filterList[i].cityName : '';
      const fullCity = cityIndex ? `${ cityIndex } ${ cityName }` : cityName

      ADDRESSES[i].innerText = filterList[i] ? filterList[i].address : '';
      CITIES[i].innerText = fullCity || '';
      BLOCKS[i].classList.remove('block-hidden');

      BLOCKS[i].addEventListener('click', function() {
        const coordinates = filterList[i].coordinates
        centerMap(coordinates);
      })
    }
  }

  function renderFirstAddress(elem) {
    const cityIndex = elem ? elem.cityIndex : '';
    const cityName = elem ? elem.cityName : '';
    const fullCity = cityIndex ? `${ cityIndex } ${ cityName }` : cityName

    ADDRESSES[0].innerText = elem.address || '';
    CITIES[0].innerText = fullCity || '';
    BLOCKS[0].classList.remove('block-hidden');
    BLOCKS[0].addEventListener('click', function() {
      centerMap(elem.coordinates)
    })

    centerMap(elem.coordinates)
  }

  function centerMap(coordinates) {
    MY_MAP.setCenter(coordinates, 16);
  }

  function filterResp(arr) {
    return arr.filter(item => {
      const curMass = item.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components
      const fItem = curMass.find(item => item.kind === 'locality')

      if (!fItem) {
        return false
      }

      return item
    })
  }

  function findItems() {
    CURRENT_CITY_LIST = []

    data.forEach(item => {
      const cityName = CURRENT_CITY.toLowerCase();
      const curCityName = item.cityName.toLowerCase();

      if (cityName === curCityName) {
        CURRENT_CITY_LIST.push(item)
      }
    })
  }

  function findCity(searchData) {
    const str = String(searchData).toLowerCase()
    let res = false;

    data.forEach(item => {
      const city = item.cityName.toLowerCase()
      if(str === city) {
        res = item
        return false
      }
    })

    if (!res) {
      FILTER_CARD_INPUT.classList.add('input-error')
      FILTER_CARD_INPUT_ERROR.classList.add('text-error')
      setTimeout(() => {
        FILTER_CARD_INPUT.classList.remove('input-error')
        FILTER_CARD_INPUT_ERROR.classList.remove('text-error')
      }, 3000)
      return
    }

    CURRENT_CITY = res.cityName;
    MY_MAP.setCenter(res.coordinates, 9);
  }

  FILTER_CARD_ICON.addEventListener('click', () => {
    FILTER_CARD.classList.add('block-hidden')
    INFO_CARD.classList.remove('block-hidden')
  })

  FILTER_CARD_INPUT.addEventListener('change', (e) => {
    const searchData = e.target.value;
    findCity(searchData)
  })

  FILTER_LIST_ITEMS.forEach((item, index) => {
    item.addEventListener('click', () => {
      FILTER_LIST_ICONS[index].classList.toggle('icon-check')
    })
  })

  function init() {
    const geolocation = ymaps.geolocation,
      myMap = new ymaps.Map('main-container-map', {
        center: [56.265637, 90.493245],
        zoom: 12,
        controls: [],
      }, {
        searchControlProvider: 'yandex#search'
      });

    geolocation.get({
      provider: 'yandex',
      mapStateAutoApply: true
    }).then(function (result) {
      myMap.geoObjects.add(result.geoObjects);

      const geocoderUrl = `${yUrl}${result.geoObjects.position[1]},${result.geoObjects.position[0]}`;

      fetch(geocoderUrl)
        .then(res => res.json())
        .then(json => {
          const res = json.response.GeoObjectCollection.featureMember;
          const filterResult = filterResp(res)
          const curMass = filterResult[0].GeoObject.metaDataProperty.GeocoderMetaData.Address.Components
          const fItem = curMass.find(item => item.kind === 'locality')
          CURRENT_CITY = fItem.name
          findItems();
          renderAddressesList();
        })
        .catch(err => console.log(err))
    });

    const objectManager = new ymaps.ObjectManager({
      clusterize: true,
      gridSize: 24,
      clusterDisableClickZoom: false,
      geoObjectOpenBalloonOnClick: false,
      clusterOpenBalloonOnClick: false,
      hasBalloon: false,
    });

    const features = data.map((point, index) => {
      return {
        type: "Feature",
        id: index,
        geometry: { type: "Point", coordinates: point.coordinates },
        properties: {
          city: point.cityName,
          addressId: point.address,
        },
        options: {
          iconLayout: 'default#image',
          iconImageHref: 'https://cdn.jsdelivr.net/gh/oprotono/champion@main/redpointicon.svg',
          iconImageSize: [30, 30],
          iconImageOffset: [-12, -38]
        },
      };
    });

    const featureCollection = {
      "type": "FeatureCollection",
      "features": features
    }

    myMap.geoObjects.add(objectManager);
    objectManager.add(featureCollection);

    const onClusterEvent = (e) => {
      const id = e.get('objectId')
      const item = objectManager.objects.getById(id);

      if (item) {
        const curCoordinates = item.geometry.coordinates;
        CURRENT_POINT = data.find((item) => item.coordinates === curCoordinates)

        renderAddressesList(CURRENT_POINT)
      }
    }

    objectManager.events.add(['click'], onClusterEvent);

    MY_MAP = myMap
  }
})()
