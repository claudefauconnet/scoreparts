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
            for (var pageNum in scoreParts.allPagesZones.pages) {
                var page=scoreParts.allPagesZones.pages[pageNum]
                //   console.log(page+" "+scoreParts.allPagesZones.pages[page].length)
                if (page.length > 0 && page.length % numberOfVoices != 0) {
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


        self.mergeVoicesZones = function (voicePagesZones) {
            var nodes = $('#voicesTreeDiv').jstree().get_checked(true)
            var mergedVoices = []
            nodes.forEach(function (node, index) {

                if (node.data && node.data.index !== null) {
                    mergedVoices.push(node.data.index)
                }

            })


            var rootVoiceIndex = mergedVoices[0]
            for (var pageNum in scoreParts.allPagesZones.pages) {
                voicePagesZones.pages[pageNum] = []
                var zones = scoreParts.allPagesZones.pages[pageNum]


                zones[rootVoiceIndex].x = 70
                for (var i = rootVoiceIndex; i < zones.length; i += self.numberOfVoices) {
                    mergedVoices.forEach(function (voiceIndex) {
                        var index2 = i + (voiceIndex - rootVoiceIndex)
                        if (!scoreParts.currentMovement || scoreParts.currentMovement == zones[index2].movement) {
                            if (voiceIndex == rootVoiceIndex) {
                                zones[index2].merged = true
                            } else {
                                zones[index2].x = zones[rootVoiceIndex].x
                                zones[index2].width = zones[rootVoiceIndex].width
                            }
                            voicePagesZones.pages[pageNum].push(zones[index2])

                        }
                    })
                }

            }


        }

        self.fillVoiceZones = function (voice, voicePagesZones) {
            for (var pageNum in scoreParts.allPagesZones.pages) {
                var zones = scoreParts.allPagesZones.pages[pageNum]
                //    if (zones.length > 0  && zones[0].movement==scoreParts.currentMovement ) {
                if (true) {
                    voicePagesZones.pages[pageNum] = []


                    for (var i = voice.index; i < zones.length; i += self.numberOfVoices) {

                        if (!scoreParts.currentMovement || scoreParts.currentMovement == zones[i].movement) {
                            var zone = JSON.parse(JSON.stringify(zones[i]))

                            voicePagesZones.pages[pageNum].push(zone)

                        }
                    }
                }

            }
        }


        self.copyMeasuresOnAllVoices = function (voicePagesZones, numOfVoices) {

            for (var pageNum in voicePagesZones.pages) {
                var zones = voicePagesZones.pages[parseInt(pageNum)]
                for (var i = 0; i < zones.length; i++) {
                    if (i == 0 || i == numOfVoices) {
                        currentMeasure = zones[i].measure
                    } else {
                        zones[i].measure = currentMeasure
                    }


                }
            }


        }

        self.validateDialog = function (merge) {
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


            async.eachSeries(voices, function (voice, callbackEachVoice) {


                var voicePagesZones = {pages: {}}

                var title = $("#voices_scoreTitle").val()
                voicePagesZones.title = title
                scoreParts.allPagesZones.numberOfVoices = self.numberOfVoices
                scoreParts.allPagesZones.title = title
                scoreParts.modified=true;
                Proxy.saveZones()

                self.copyMeasuresOnAllVoices(scoreParts.allPagesZones, self.numberOfVoices)
                if (merge) {
                    self.mergeVoicesZones(voicePagesZones)
                } else {
                    self.fillVoiceZones(voice, voicePagesZones)
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

                    if (merge) {
                        return callbackEachVoice("mergeEnd")
                    }
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
                scoreParts.modified=true;
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
                    scoreParts.modified=true
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