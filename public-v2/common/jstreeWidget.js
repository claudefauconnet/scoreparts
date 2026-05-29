// Globals externes attendus : `$` (jQuery + plugin jstree).
export const JstreeWidget = {};

JstreeWidget.types = {
  Thesaurus: {
    icon: '../icons/thesaurus.png',
  },
  // Ontology
  Source: {
    icon: './icons/CommonIcons/SourceIcon.png',
  },

  Class: {
    li_attr: { style: 'color:black' },
    icon: './icons/JstreeIcons/Classes.png',
  },

  Property: {
    li_attr: { style: 'color:black' },
    icon: './icons/JstreeIcons/Property.png',
  },
  Container: {
    icon: './icons/JstreeIcons/Container.png',
  },
  Individual: {
    icon: './icons/JstreeIcons/Individual.png',
  },
  /* KG creator */
  Table: {
    icon: './icons/JstreeIcons/Table.png',
  },
  Column: {
    icon: './icons/JstreeIcons/Columns.png',
  },
  databaseSources: {
    icon: './icons/JstreeIcons/databaseSources.png',
  },
  DataSource: {
    icon: './icons/JstreeIcons/DataSource.png',
  },
  CSV: {
    icon: './icons/JstreeIcons/FileCSV.png',
  },
  CSVS: {
    icon: './icons/JstreeIcons/CSVS.png',
  },

  // Classic items
  default: {
    icon: './icons/JstreeIcons/Default.png',
  },

  Folder: {
    icon: './icons/JstreeIcons/Folder.png',
  },

  /* To delete */
  //double
  class: {
    icon: './icons/JstreeIcons/Classes.png',
  },
  //double
  'owl:ObjectProperty': {
    icon: './icons/JstreeIcons/Property.png',
  },
  // Triple
  'owl:Class': {
    li_attr: { style: 'color:black' },
    icon: './icons/JstreeIcons/Classes.png',
  },
  // double
  'http://www.w3.org/2002/07/owl#NamedIndividual': {
    icon: './icons/JstreeIcons/Individual.png',
  },
};

JstreeWidget.loadJsTree = function (jstreeDiv, jstreeData, options, callback) {
  if (!jstreeDiv) {
    JstreeWidget.jstreeDiv = 'jstreeWidget_treeDiv';
    jstreeDiv = JstreeWidget.jstreeDiv;
    JstreeWidget.dialogDiv = 'smallDialogDiv';

    $('#smallDialogDiv').dialog('option', 'title', 'Select items');

    $('#smallDialogDiv').load('modules/uiWidgets/html/jsTreeWidget.html', function () {
      $('#smallDialogDiv').dialog('open');
      JstreeWidget.loadJsTree('jstreeWidget_treeDiv', jstreeData, options, callback);
    });
    return;
  } else {
    JstreeWidget.jstreeDiv = jstreeDiv;
  }

  var jstreeData2 = [];
  jstreeData.forEach(function (item) {
    if (item.parent != item.id) {
      jstreeData2.push(item);
    }
  });
  jstreeData = jstreeData2;

  if (!options) {
    options = {};
  }
  JstreeWidget.options = options;
  var plugins = [];
  if (!options.cascade) {
    options.cascade = 'xxx';
  }
  if (options.selectDescendants) {
    options.cascade = 'down';
  }
  if (options.withCheckboxes) {
    plugins.push('checkbox');
  }
  if (options.searchPlugin) {
    plugins.push('search');
  }

  if (options.contextMenu) {
    // $(".jstree-contextmenu").css("z-index",100)
    plugins.push('contextmenu');
  }
  if (options.dnd) {
    plugins.push('dnd');
  }

  if (options.notTypes) {
    var icons = false;
  } else {
    var icons = true;
    plugins.push('types');
  }

  var check_callbackFn = function (op, node, parent, position, more) {
    if (op == 'move_node' && options.dropAllowedFn) {
      return options.dropAllowedFn(op, node, parent, position, more);
    } else {
      return true;
    }
  };

  if ($('#' + jstreeDiv).jstree) {
    $('#' + jstreeDiv).jstree('destroy');
  }
  $('#' + jstreeDiv)
    .jstree({
      /* "checkbox": {
"keep_selected_style": false
},*/
      plugins: plugins,
      core: {
        data: jstreeData,
        check_callback: check_callbackFn,
        themes: {
          icons: icons,
        },
      },
      dnd: options.dnd,
      search: options.searchPlugin,
      checkbox: {
        tie_selection: options.tie_selection === true,
        whole_node: false,
      },
      types: JstreeWidget.types,

      contextmenu: { items: options.contextMenu },
    })
    .on('loaded.jstree', function () {
      //  setTimeout(function () {
      if (options.openAll) {
        $('#' + (jstreeDiv || JstreeWidget.jstreeDiv))
          .jstree(true)
          .open_all();
      }

      JstreeWidget.setTreeAppearance();
      if (!options.doNotAdjustDimensions) {
        JstreeWidget.setTreeParentDivDimensions(jstreeDiv);
      }
      if (options.check_all) {
        JstreeWidget.checkAll();
      }
      if (callback) {
        if (jstreeData) {
          callback(jstreeData);
        } else {
          callback();
        }
      }
      //   }, 500)
    })
    .on('select_node.jstree', function (evt, obj) {
      if (options.selectTreeNodeFn) {
        options.selectTreeNodeFn(evt, obj);
      }
    })
    .on('open_node.jstree', function (evt, obj) {
      JstreeWidget.setTreeAppearance();
      if (options.onOpenNodeFn) {
        options.onOpenNodeFn(evt, obj);
      }
    })
    .on(' after_open.jstree', function (evt, obj) {
      JstreeWidget.setTreeAppearance();
      if (options.onAfterOpenNodeFn) {
        options.onAfterOpenNodeFn(evt, obj);
      }
    })

    .on('enable_checkbox.jstree', function (evt, obj) {
      if (options.onCheckNodeFn) {
        options.onCheckNodeFn(evt, obj);
      }
    })
    .on('check_node.jstree', function (evt, obj) {
      if (options.onCheckNodeFn) {
        options.onCheckNodeFn(evt, obj);
      }
    })
    .on('uncheck_node.jstree', function (evt, obj) {
      if (options.onUncheckNodeFn) {
        options.onUncheckNodeFn(evt, obj);
      }
    })
    .on('create_node.jstree', function (parent, node, position) {
      if (options.onCreateNodeFn) {
        options.onCreateNodeFn(parent, node, position);
        JstreeWidget.setTreeAppearance();
      }
    })
    .on('delete_node.jstree', function (node, parent) {
      if (options.deleteNodeFn) {
        options.deleteNodeFn(node, parent);
        JstreeWidget.setTreeAppearance();
      }
    })
    .on(
      'move_node.jstree',
      function (
        node,
        parent,
        position,
        oldParent,
        oldPosition,
        is_multi,
        old_instance,
        new_instance
      ) {
        if (options.onMoveNodeFn) {
          options.onMoveNodeFn(
            node,
            parent,
            position,
            oldParent,
            oldPosition,
            is_multi,
            old_instance,
            new_instance
          );
          JstreeWidget.setTreeAppearance();
        }
      }
    )
    .on('show_contextmenu', function (node, x, y) {
      if (options.onShowContextMenu) {
        options.onShowContextMenu(node, x, y);
      }
    });

  if (options.dnd) {
    if (options.dnd.drag_start) {
      $(document).on('dnd_start.vakata', function (data, element, helper, event) {
        options.dnd.drag_start(data, element, helper, event);
      });
    }
    if (options.dnd.drag_move) {
      $(document).on('dnd_move.vakata Event', function (data, element, helper, event) {
        options.dnd.drag_move(data, element, helper, event);
      });
    }
    if (options.dnd.drag_stop) {
      $(document).on('dnd_stop.vakata Event', function (data, element, helper, event) {
        options.dnd.drag_stop(data, element, helper, event);
      });
    }
  }

  if (options.onHoverNode) {
    $('#' + (jstreeDiv || JstreeWidget.jstreeDiv)).on('hover_node.jstree', function (node) {
      options.onHoverNode(node);
    });
  }
};

JstreeWidget.clear = function (jstreeDiv) {
  $('#' + (jstreeDiv || JstreeWidget.jstreeDiv))
    .jstree('destroy')
    .empty();
};
JstreeWidget.empty = function (jstreeDiv) {
  try {
    $('#' + jstreeDiv)
      .jstree(true)
      .delete_node(
        $('#' + jstreeDiv)
          .jstree(true)
          .get_node('#').children
      );
  } catch (e) {
    console.log(e);
  }
};
JstreeWidget.addNodesToJstree = function (jstreeDiv, parentNodeId_, jstreeData, options, callback) {
  if (!jstreeDiv) {
    jstreeDiv = JstreeWidget.jstreeDiv;
  }
  if (!options) {
    options = {};
  }
  if (!callback) {
    callback = function () {};
  }
  var position = 'first';
  if (options.positionLast) {
    position = 'last';
  }
  JstreeWidget.orderJstreeDataForCreation(jstreeDiv, jstreeData);
  if (!Array.isArray(jstreeData)) {
    jstreeData = [jstreeData];
  }
  jstreeData.forEach(function (node) {
    var Jstree_id = $('#' + jstreeDiv)
      .jstree(true)
      .get_node(node.id);
    if (Jstree_id == false) {
      var parentNodeId = parentNodeId_;

      if (!parentNodeId_) {
        parentNodeId = node.parent;
      }

      if (!parentNodeId) {
        return;
      }

      if (parentNodeId == node.id) {
        return console.error('  Error jstree parent == childNode : ' + parentNodeId);
      }

      var parentNodeObj = $('#' + jstreeDiv)
        .jstree(true)
        .get_node(parentNodeId);

      // parent exists and have children

      //Create node
      $('#' + (jstreeDiv || JstreeWidget.jstreeDiv))
        .jstree(true)
        .create_node(parentNodeId, node, position, function () {
          JstreeWidget.setTreeAppearance();
          $('#' + (jstreeDiv || JstreeWidget.jstreeDiv))
            .jstree(true)
            .open_node(parentNodeId, null, 500);
        });
    }
  });
  if (callback) {
    callback(jstreeData);
  }
};

JstreeWidget.deleteNode = function (jstreeDiv, nodeId) {
  $('#' + (jstreeDiv || JstreeWidget.jstreeDiv))
    .jstree(true)
    .delete_node(nodeId);
  JstreeWidget.setTreeAppearance();
};
JstreeWidget.deleteBranch = function (jstreeDiv, nodeId, deleteNodeItself) {
  if (!jstreeDiv) {
    jstreeDiv = JstreeWidget.jstreeDiv;
  }
  var descendants = JstreeWidget.getNodeDescendants(jstreeDiv, nodeId, null, true);
  if (deleteNodeItself) {
    if (descendants.indexOf(nodeId) < 0) {
      descendants.push(nodeId);
    }
  } else {
    var index = descendants.indexOf(nodeId);
    if (index > -1) {
      descendants.splice(index, 1);
    }
  }
  /* descendants.forEach(function(item){
$("#" + jstreeDiv).jstree(true).delete_node(item)
})*/
  try {
    $('#' + (jstreeDiv || JstreeWidget.jstreeDiv))
      .jstree(true)
      .delete_node(descendants);
  } catch (e) {
    console.error(e);
  }
};
JstreeWidget.getjsTreeCheckedNodes = function (jstreeDiv) {
  if (!jstreeDiv) {
    jstreeDiv = JstreeWidget.jstreeDiv;
  }
  return $('#' + jstreeDiv)
    .jstree()
    .get_checked(true);
};

JstreeWidget.setjsTreeCheckedNodes = function (jstreeDiv, checkedNodes) {
  if (!jstreeDiv) {
    jstreeDiv = JstreeWidget.jstreeDiv;
  }
  return $('#' + jstreeDiv)
    .jstree()
    .check_node(checkedNodes);
};

JstreeWidget.getjsTreeNodes = function (jstreeDiv, IdsOnly, parentNodeId) {
  if (!jstreeDiv) {
    jstreeDiv = JstreeWidget.jstreeDiv;
  }
  if (!parentNodeId) {
    parentNodeId = '#';
  }
  var idList = [];
  var jsonNodes = $('#' + jstreeDiv)
    .jstree()
    .get_json(parentNodeId, { flat: true });

  if (IdsOnly) {
    jsonNodes.forEach(function (item) {
      idList.push(item.id);
    });
    return idList;
  } else {
    return jsonNodes;
  }
};

JstreeWidget.setSelectedNodeStyle = function (style, id) {
  var node = $('.jstree-clicked');
  for (var key in style) {
    node.css(key, style[key]);
  }
};

JstreeWidget.getjsTreeNodeObj = function (jstreeDiv, id) {
  if (!jstreeDiv) {
    jstreeDiv = JstreeWidget.jstreeDiv;
  }
  return $('#' + jstreeDiv)
    .jstree(true)
    .get_node(id);
};
// get node from node.data field
JstreeWidget.getNodeByDataField = function (jstreeDiv, property, value) {
  if (!jstreeDiv) {
    jstreeDiv = JstreeWidget.jstreeDiv;
  }
  if (!$('#' + jstreeDiv).jstree(true)) {
    return null;
  }
  var jsonNodes = $('#' + jstreeDiv)
    .jstree(true)
    .get_json('#', { flat: true });
  var matchingNode = null;
  jsonNodes.forEach(function (node) {
    if (node.data && node.data[property] == value) {
      return (matchingNode = node);
    }
  });
  return matchingNode;
};

JstreeWidget.getNodeDescendants = function (jstreeDiv, parentNodeId, depth, onlyIds) {
  if (!jstreeDiv) {
    jstreeDiv = JstreeWidget.jstreeDiv;
  }
  var nodes = [];
  var nodeIdsMap = {};

  var recurse = function (nodeId, level) {
    if (depth && level > depth) {
      return;
    }

    var node = $('#' + jstreeDiv)
      .jstree(true)
      .get_node(nodeId);
    if (!nodeIdsMap[nodeId]) {
      nodeIdsMap[nodeId] = 1;
      if (nodeId != parentNodeId) {
        if (onlyIds) {
          nodes.push(node.id);
        } else {
          nodes.push(node);
        }
      }
      // Attempt to traverse if the node has children
      if (node.children) {
        node.children.forEach(function (child) {
          recurse(child, level + 1);
        });
      }
    }
  };
  recurse(parentNodeId, 0);

  return nodes;
};
JstreeWidget.openNodeDescendants = function (jstreeDiv, nodeId, depth) {
  if (!jstreeDiv) {
    jstreeDiv = JstreeWidget.jstreeDiv;
  }
  $('#' + (jstreeDiv || JstreeWidget.jstreeDiv))
    .jstree()
    .open_node(nodeId);
  var descendants = JstreeWidget.getNodeDescendants(jstreeDiv || JstreeWidget.jstreeDiv, nodeId, depth);
  $('#' + (jstreeDiv || JstreeWidget.jstreeDiv))
    .jstree()
    .open_node(descendants);
};

JstreeWidget.setTreeParentDivDimensions = function (jstreeDiv) {
  if (!jstreeDiv) {
    jstreeDiv = JstreeWidget.jstreeDiv;
  }
  var parentDiv = $('#' + jstreeDiv).parent();
  if (!parentDiv) {
    // || parentDiv.width)
    return;
  }

  var p = $('#' + jstreeDiv).offset();
  if (p.top > 200) {
    //in case jstreeDiv in inactive tab
    p.top = 200;
  }
  var h = $(window).height() - p.top - 50;
  var w;
  if (p.left < 600) {
    w = 380;
  } else {
    w = 340;
  }
  // parentDiv.width(w);

  if (jstreeDiv == 'LineageNodesJsTreeDiv') {
    // cannot do it generic !!!!!
    parentDiv.height(h);
  }
  if (jstreeDiv == 'Lineage_propertiesTree') {
    parentDiv.height(h);
  }
  if (jstreeDiv == 'Blender_conceptTreeDiv') {
    parentDiv.height(h);
  }

  parentDiv.css('overflow', 'auto');
  parentDiv.css('margin-top', '5px');
};

JstreeWidget.setTreeAppearance = function () {
  return;
};
JstreeWidget.onAllTreeCbxChange = function (allCBX, jstreeDiv) {
  if (!jstreeDiv) {
    jstreeDiv = JstreeWidget.jstreeDiv;
  }
  var checked = $(allCBX).prop('checked');
  if (checked) {
    $('#' + jstreeDiv)
      .jstree(true)
      .check_all();
  } else {
    $('#' + jstreeDiv)
      .jstree(true)
      .uncheck_all();
  }
};
JstreeWidget.checkAll = function (jstreeDiv) {
  if (!jstreeDiv) {
    jstreeDiv = JstreeWidget.jstreeDiv;
  }
  $('#' + jstreeDiv)
    .jstree()
    .check_all();
};
JstreeWidget.openNode = function (jstreeDiv, nodeId) {
  if (!jstreeDiv) {
    jstreeDiv = JstreeWidget.jstreeDiv;
  }
  $('#' + jstreeDiv)
    .jstree()
    .open_node(nodeId);
};

JstreeWidget.selectTypeForIconsJstree = function (types, callback) {
  var uri_class = 'http://www.w3.org/2002/07/owl#Class';
  var uri_bag = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag';
  var uri_named = 'http://www.w3.org/2002/07/owl#NamedIndividual';
  var uri_bag2 = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag';
  var type = null;

  if (!types) {
    return 'default';
  } else {
    if (!Array.isArray(types)) {
      types = [types];
    }
    var types_without_basics = types.filter(function (item) {
      return item !== uri_class && item !== uri_bag && item !== uri_named && item !== uri_bag2;
    });
  }

  if (callback) {
    if (types_without_basics.length > 0) {
      var adding_type = null;
      adding_type = callback(types_without_basics);
      if (adding_type) {
        type = adding_type;
      }
    }
  }
  if (!type) {
    if (types.includes(uri_bag)) {
      type = 'Container';
    }
    if (types.includes(uri_named)) {
      type = 'Individual';
    }
    if (types.includes(uri_class)) {
      type = 'Class';
    }
  }

  if (!type) {
    // last which have icon available for multitypes objects
    var types_available = JstreeWidget.types;
    type = 'default';
    types.forEach(function (item) {
      if (types_available[item]) {
        type = item;
      }
    });
  }
  return type;
};

JstreeWidget.getNodeByURI = function (jstreeDiv, id) {
  var data = $('#' + jstreeDiv).jstree()._model.data;
  var node_finded = false;
  for (var key in data) {
    var node = data[key];
    if (key != '#') {
      if (node.data.id == id) {
        node_finded = node;
      }
    }
  }
  return node_finded;
};

JstreeWidget.orderJstreeDataForCreation = function (jstreeDiv, JstreeData) {
  if (!jstreeDiv) {
    jstreeDiv = JstreeWidget.jstreeDiv;
  }
  var length = JstreeData.length;
  var n = 0;
  while (n < length) {
    var node = JstreeData[n];
    var parentNodeId = node.parent;
    var parentNodeObj = $('#' + jstreeDiv)
      .jstree(true)
      .get_node(parentNodeId);
    n++;
    // parent not exist in tree
    if (parentNodeObj == false) {
      var indexfinded = JstreeWidget.checkinJstreeData(JstreeData, parentNodeId);
      if (indexfinded > n - 1) {
        //pass jstreeData[i] to jstreeData[0]
        var node_finded = JstreeData[indexfinded];
        JstreeData.splice(indexfinded, 1);
        JstreeData.splice(0, 0, node_finded);

        n = 0;
      }
    }
  }
};

JstreeWidget.checkinJstreeData = function (jstreeData, id) {
  var node_finded = null;
  var i = 0;
  var index_finded = null;

  jstreeData.forEach(function (node) {
    if (node.id == id) {
      node_finded = node;
      index_finded = i;
    }
    i++;
  });

  return index_finded;
};

JstreeWidget.validateSelfDialog = function () {
  var selected = $('#jstreeWidget_treeDiv').jstree().get_checked(true);
  if (selected.length == 0) {
    var selected = $('#jstreeWidget_treeDiv').jstree().get_selected(true);
  }
  $('#' + JstreeWidget.dialogDiv).dialog('close');
  if (JstreeWidget.options.validateFn) {
    JstreeWidget.options.validateFn(selected);
  }
};

JstreeWidget.closeDialog = function () {
  $('#smallDialogDiv').dialog('close');
};

JstreeWidget.searchValue = function (value) {
  if (event.keyCode != 13 && event.keyCode != 9) {
    return;
  }
  $('#' + JstreeWidget.jstreeDiv)
    .jstree(true)
    .search(value);
  $('#jstreeWidget_searchInput').val('');
};
JstreeWidget.updateJstree = function (divId, newData, options) {
  if (!Array.isArray(newData)) {
    return;
  }
  if (!options) options = {};
  var newData2 = JSON.parse(JSON.stringify(newData));
  var keyToKeep = ['data', 'text', 'id', 'parent'];
  newData2.forEach(function (item) {
    for (let key in item) {
      if (!keyToKeep.includes(key)) {
        delete item[key];
      }
    }
  });
  newData2 = newData2.filter(function (item) {
    return item.id != '#';
  });
  $('#' + divId).jstree(true).settings.core.data = newData2;
  // deselect nodes clicked to not trigger events with refresh
  $('#' + divId)
    .jstree(true)
    .deselect_all();
  if (options.openAll) {
    $('#' + divId).on('refresh.jstree', function () {
      $('#' + divId)
        .jstree(true)
        .open_all();
      $('#' + divId).off('refresh.jstree');
    });
  }
  $('#' + divId)
    .jstree(true)
    .refresh();
};

JstreeWidget.filterTree = function (input, jstreeDiv) {
  if (!jstreeDiv) {
    jstreeDiv = JstreeWidget.jstreeDiv;
  }
  var keyword = input.val();
  if (keyword != '' && keyword.length < 2) {
    return;
  }
  $('#' + jstreeDiv).jstree('search', keyword);
  //input.val("")
};

export default JstreeWidget;
