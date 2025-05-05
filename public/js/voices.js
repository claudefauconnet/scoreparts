var Voices = (function () {

    var self = {}

    self.html = "<div  style='width:400px;height:700px'>" +
        "Titre pièce<input id='voices_scoreTitle' size='200px'> &nbsp;" +
        "Mouvement<input id='voices_movementSelect' > &nbsp;" +
        "<div id='voicesTreeContainer' style='width:400px;height:600px'>" +
        " <div id='voicesTreeDiv'></div>" +
        "</div>" +
        "<div>" +

        "<button onclick='Voices.validateDialog()'>OK</button>" +
        "<button onclick='Voices.getZip()'>telecharger Zip</button>" +
        "<button onclick='Voices.saveMovement()'>enregister Mouvement</button>" +

        "</div>" +
        "</div>"

    self.getDistinctVoices = function () {
        var voices = []
        self.firstPageOfMovement = null
        for (var page in scoreParts.allPagesZones.pages) {
            scoreParts.allPagesZones.pages[page].forEach(function (zone, index) {
                if (scoreParts.currentMovement == zone.movement) {
                    if (!self.firstPageOfMovement) {
                        self.firstPageOfMovement = parseInt(page)
                    }
                    if (!zone.voice) {
                        zone.voice = index
                    }
                    if (voices.indexOf(zone.voice) < 0) {
                        voices.push(zone.voice)
                    }
                }
            })
        }

        return voices

    }

    self.detectWrongPages = function (numberOfVoices) {
        for (var page in scoreParts.allPagesZones.pages) {
            //   console.log(page+" "+scoreParts.allPagesZones.pages[page].length)
            if (scoreParts.allPagesZones.pages.length > 0 && scoreParts.allPagesZones.pages.length % numberOfVoices != 0) {
                alert(" wrong  number of scales in page " + page)
            }


        }
    }

    self.showVoicesDialog = function () {
        if (scoreParts.allPagesZones.pages == 0) {
            return alert("pas de decoupage effectué")
        }
        if (!scoreParts.currentMovement) {
            return alert("pas de mouvement selectionne")
        }

        scoreParts.writeCurrentPageZones()
        scoreParts.copyMeasuresOnAllVoices()


        var jstreedata = [{
            id: "voices",
            text: "voices",
            parent: "#"
        }];

        var voices = self.getDistinctVoices()


        self.numberOfVoices = parseInt(prompt("nombre total de voix ", voices.length))
        scoreParts.changePage(self.firstPageOfMovement, false)

        self.nunmberOfSystems = voices.length / self.numberOfVoices
        if (!Number.isInteger(self.nunmberOfSystems)) {
            self.detectWrongPages(self.numberOfVoices)
            //   return alert("mauvais nombre de voix  " + self.nunmberOfSystems)
        }

        if (self.numberOfVoices != voices.length) {
            voices = voices.slice(0, self.numberOfVoices);

        }


        voices.forEach(function (voice, index) {
            if (!voice) {
                voice = "" + index
            }
            var label = voice + " <span style='font-style:italic;color:blue' id='pdfLinkDiv_" + voice.replace(/ /, "_") + "'>...</span>"
            jstreedata.push({
                id: "voice_" + voice,
                text: label,
                parent: "voices",
                data: {voice: voice, index: index,}
            })
        })
        var options = {
            withCheckboxes: true,
            openAll: true,
            selectTreeNodeFn: Voices.onSelectVoice
        };


        //   $("#mainDialogDiv").html(self.html)
        //  $("#mainDialogDiv").dialog("open")


        var title = scoreParts.allPagesZones.title || scoreParts.pdfName
        /*  if(scoreParts.currentMovement)
              title+= " "+scoreParts.currentMovement*/
        $("#voices_scoreTitle").val(title)


        JstreeWidget.loadJsTree("voicesTreeDiv", jstreedata, options)


    }

    self.validateDialog = function () {
        var nodes = $('#voicesTreeDiv').jstree().get_checked(true)


        var voices = []
        nodes.forEach(function (node) {
            if (node.data && node.data.voice !== null) {
                voices.push({
                    id: node.data.voice,
                    index: node.data.index,
                    label: node.data.voiceLabel || node.data.voice
                })
            }
        })
        self.voices


        async.eachSeries(voices, function (voice, callbackEachVoice) {


            var voicePagesZones = {pages: {}}

            var title = $("#voices_scoreTitle").val()
            voicePagesZones.title = title
            scoreParts.allPagesZones.numberOfVoices = self.numberOfVoices
            scoreParts.allPagesZones.title = title
            Proxy.saveZones()

            for (var pageNum in scoreParts.allPagesZones.pages) {
                voicePagesZones.pages[pageNum] = []
                var zones = scoreParts.allPagesZones.pages[pageNum]


                for (var i = voice.index; i < zones.length; i += self.numberOfVoices) {
                    if (!scoreParts.currentMovement || scoreParts.currentMovement == zones[i].movement) {
                        voicePagesZones.pages[pageNum].push(zones[i])
                    }
                }

            }


            $("#pdfLinkDiv_" + voice.id.replace(/ /, "_")).html("processing...");

            // $('#voicesTreeDiv').jstree().uncheck_node(voice.id)
            Proxy.generateInstrumentScore(voice.label, voicePagesZones, function (err, result) {
                if (err) {
                    return callbackEachVoice(err)
                }
                var nodes = $('#voicesTreeDiv').jstree().get_checked(true)
                nodes.forEach(function (node) {
                    if (node.data && node.data.voice == voice.id) {
                        node.data.pdfLink = result
                    }
                })
                $("#pdfLinkDiv_" + voice.id.replace(/ /, "_")).html(" <a target='_blank' href='" + document.location.href + result + "'>télécharger</a>")
                callbackEachVoice()

            })
        }, function (err) {

        })


    }

    self.saveMovement = function () {

        var movementLabel = prompt("nom du mouvement")
        if (movementLabel) {
            for (var page in scoreParts.allPagesZones.pages) {
                scoreParts.allPagesZones.pages[page].forEach(function (zone) {
                    if (!zone.movement) {
                        zone.movement = movementLabel
                    }
                })
            }
            Proxy.saveZones()
        }
    }

    self.onSelectVoice = function (event, obj) {
        if (obj.node.data.pdfLink) {
            window.open(document.location.href + obj.node.data.pdfLink, '_blank')

            return;
        }


        if (obj.node.data) {
            var voiceLabel = prompt("voice name")
            if (voiceLabel) {
                var label = voiceLabel + " <span id='pdfLinkDiv_" + obj.node.data.voice + "'>...</span>"
                $('#voicesTreeDiv').jstree('rename_node', obj.node, label)
                obj.node.data.voiceLabel = voiceLabel
                $('#voicesTreeDiv').jstree().check_node(obj.node)

             /*   if (!self.voices[scoreParts.currentMovement]) {
                    self.voices[scoreParts.currentMovement] = {}
                    if (!self.voices[scoreParts.currentMovement]) {
                        self.voices[scoreParts.currentMovement] = {}
                    }
                    self.voices[scoreParts.currentMovement][obj.node.data.index] = voiceLabel*/


                    for (var pageNum in scoreParts.allPagesZones.pages) {
                        var zones = scoreParts.allPagesZones.pages[pageNum]
                        var zoneIndex = obj.node.data.index

                        do {
                            if (zones[zoneIndex] && zones[zoneIndex].movement == scoreParts.currentMovement) {
                                zones[zoneIndex].voice = voiceLabel
                            }
                            zoneIndex += self.numberOfVoices
                        }

                        while (zoneIndex < zones.length)
                    }


                    var x = scoreParts.allPagesZones.pages

                    Proxy.saveZones(function (err) {
                        if (!err) {
                            Paper.drawZones(scoreParts.currentZones)
                        }
                    })


                }

            }
        }

        self.getZip = function () {

            Proxy.createZip()
        }


        return self


    }
)
    ()