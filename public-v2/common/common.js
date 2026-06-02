export const Common = {};

Common.toRoman = function (n) {
  const romanValues = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const romanSymbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  romanValues.forEach((romanValue, romanValueIndex) => {
    while (n >= romanValue) {
      result += romanSymbols[romanValueIndex];
      n -= romanValue;
    }
  });
  return result;
};


/*
Common.fillSelectOptions = function (
  selectId,
  data,
  withBlanckOption,
  textfield,
  valueField,
  selectedValue
) {
  $('#' + selectId)
    .find('option')
    .remove()
    .end();
  if (withBlanckOption) {
    $('#' + selectId).append(
      $('<option>', {
        text: '',
        value: '',
      })
    );
  }

  if (Array.isArray(data)) {
    data.forEach(function (item, _index) {
      var text, value;
      if (textfield) {
        if (item[textfield] && item[textfield].value && item[valueField].value) {
          text = item[textfield].value;
          value = item[valueField].value;
        } else {
          text = item[textfield];
          value = item[valueField];
        }
      } else {
        text = item;
        value = item;
      }
      var selected;
      if (selectedValue && value == selectedValue) {
        selected = 'selected';
      }
      $('#' + selectId).append(
        $('<option>', {
          text: text,
          value: value,
          selected: selected,
        })
      );
    });
  } else {
    for (var optionKey in data) {
      var item = data[optionKey];
      $('#' + selectId).append(
        $('<option>', {
          text: item[textfield] || item,
          value: item[valueField] || item,
        })
      );
    }
  }
};

Common.getResourceColor = function (resourceType, resourceId, palette) {
  if (!palette) {
    palette = 'palette';
  }
  if (!Common.resourceColorPalettes[resourceType]) {
    Common.resourceColorPalettes[resourceType] = {};
  }
  var color = Common.resourceColorPalettes[resourceType][resourceId];
  if (!color) {
    color = Common[palette][Object.keys(Common.resourceColorPalettes[resourceType]).length];
    Common.resourceColorPalettes[resourceType][resourceId] = color;
  }
  return color;
};
*/
Common.palette = [
  '#9edae5',
  '#17becf',
  '#dbdb8d',
  '#bcbd22',
  '#c7c7c7',
  '#7f7f7f',
  '#f7b6d2',
  '#e377c2',
  '#c49c94',
  '#c5b0d5',
  '#ff9896',
  '#98df8a',
  '#ffbb78',
  '#ff7f0e',
  '#aec7e8',
  '#1f77b4',
  '#9467bd',
  '#8c564b',
  '#d62728',
  '#2ca02c',
];
