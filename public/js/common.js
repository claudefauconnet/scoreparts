var Common=(function(){

    var self={}
    self.resourceColorPalettes={}
    self.fillSelectOptions = function (selectId, data, withBlanckOption, textfield, valueField, selectedValue) {
        $("#" + selectId)
            .find("option")
            .remove()
            .end();
        if (withBlanckOption) {
            $("#" + selectId).append(
                $("<option>", {
                    text: "",
                    value: "",
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
                    selected = "selected";
                }
                $("#" + selectId).append(
                    $("<option>", {
                        text: text,
                        value: value,
                        selected: selected,
                    })
                );
            });
        } else {
            for (var key in data) {
                var item = data[key];
                $("#" + selectId).append(
                    $("<option>", {
                        text: item[textfield] || item,
                        value: item[valueField] || item,
                    })
                );
            }
        }
    };
    self.getResourceColor = function (resourceType, resourceId, palette) {
        if (!palette) {
            palette = "palette";
        }
        if (!self.resourceColorPalettes[resourceType]) {
            self.resourceColorPalettes[resourceType] = {};
        }
        var color = self.resourceColorPalettes[resourceType][resourceId];
        if (!color) {
            color = Common[palette][Object.keys(self.resourceColorPalettes[resourceType]).length];
            self.resourceColorPalettes[resourceType][resourceId] = color;
        }
        return color;
    };
    self.palette = [
        "#9edae5",
        "#17becf",
        "#dbdb8d",
        "#bcbd22",
        "#c7c7c7",
        "#7f7f7f",
        "#f7b6d2",
        "#e377c2",
        "#c49c94",
        "#c5b0d5",
        "#ff9896",
        "#98df8a",
        "#ffbb78",
        "#ff7f0e",
        "#aec7e8",
        "#1f77b4",
        "#9467bd",
        "#8c564b",
        "#d62728",
        "#2ca02c",
    ];
    return self;

})()