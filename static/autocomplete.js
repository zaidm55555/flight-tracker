function setupAirportAutocomplete(inputId, hiddenId) {
  var input = document.getElementById(inputId);
  var hidden = document.getElementById(hiddenId);
  var container = input.parentElement;
  var dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown';
  container.appendChild(dropdown);

  var airports = [];
  var activeIndex = -1;

  fetch('/static/airports.json')
    .then(function(r) { return r.json(); })
    .then(function(data) { airports = data; })
    .catch(function() {});

  input.addEventListener('input', function() {
    var val = input.value.trim();
    dropdown.innerHTML = '';
    activeIndex = -1;

    if (val.length < 1) {
      dropdown.style.display = 'none';
      return;
    }

    var q = val.toLowerCase();
    var matches = airports.filter(function(a) {
      return a.code.toLowerCase().indexOf(q) > -1
        || a.city.toLowerCase().indexOf(q) > -1
        || a.name.toLowerCase().indexOf(q) > -1;
    }).slice(0, 10);

    if (matches.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    dropdown.style.display = 'block';
    matches.forEach(function(a, i) {
      var item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.innerHTML = '<span class="airport-code">' + a.code + '</span> '
        + '<span class="airport-city">' + a.city + '</span> '
        + '<span class="airport-name">' + a.name + '</span> '
        + '<span class="airport-country">' + a.country + '</span>';
      item.addEventListener('click', function() { selectAirport(a, input, hidden, dropdown); });
      item.addEventListener('mousedown', function(e) { e.preventDefault(); });
      dropdown.appendChild(item);
    });
  });

  input.addEventListener('keydown', function(e) {
    var items = dropdown.querySelectorAll('.autocomplete-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      updateActive(items, activeIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, -1);
      updateActive(items, activeIndex);
    } else if (e.key === 'Enter' && activeIndex > -1) {
      e.preventDefault();
      items[activeIndex].click();
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      activeIndex = -1;
    }
  });

  document.addEventListener('click', function(e) {
    if (!container.contains(e.target)) {
      dropdown.style.display = 'none';
      activeIndex = -1;
    }
  });

  function updateActive(items, idx) {
    items.forEach(function(item, i) {
      item.classList.toggle('active', i === idx);
    });
  }
}

function selectAirport(airport, input, hidden, dropdown) {
  hidden.value = airport.code;
  input.value = airport.city + ' (' + airport.code + ')';
  dropdown.style.display = 'none';
}
