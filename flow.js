window.jQuery = require('jquery')
window.Vel = require('materialize-css/bin/materialize')
require('./node_modules/materialize-css/dist/css/materialize.css')
require('./style.css')

var db
if (indexedDB && 'serviceWorker' in navigator) {
    // Open the indexedDB.
    var request = indexedDB.open("FlowDB", 1)
    request.onupgradeneeded = function(event) {
        db = event.target.result
        var objStore = db.createObjectStore("flows", {
            autoIncrement: true
        })
    }
    request.onsuccess = function(event) {
        console.log('opening indexeddb a success')
        db = event.target.result
    }
    request.onerror = function(event) {
        console.log('errororororro in opennin indexeddb')
    }

    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js', {
            scope: '/'
        }).then(function(registration) {
            // Registration was successful
            registration.update()
            console.log('ServiceWorker registration successful with scope: ', registration.scope)
        }).catch(function(err) {
            // registration failed :(
            //TODO: add a browser error notif
            console.log('ServiceWorker registration failed: ', err)
        })
    })
} else {
    //TODO: add a browser error notif
    alert('flow requires a browser with indexedDB and service workers')
}

var angular = require('angular')
var flowApp = angular.module('flow', [])
    .controller('flowCtrl', ['$scope', function($scope) {
        $('#lsManagerModal').modal()
        $('#infoModal').modal()
        $('#delConfirmation').modal()
        $('#unsavedModal').modal()

        $scope.flow = {}
        $scope.flow.dataL = []
        $scope.flow.leftTeam
        $scope.flow.dataR = []
        $scope.flow.rightTeam
        $scope.flow.title
        $scope.version = '0.8.2'
        $scope.key = 0 //0 means unsaved, otherwise key in indexedDB
        $scope.isSaved = true

        //check the most uptodate verion number mwahhahah
        var xhr = new XMLHttpRequest()
        xhr.open("GET", "https://api.github.com/repos/FastFlowDebate/Flow.FastFlowDebate/contents/package.json", true)
        xhr.setRequestHeader("Accept", "application/vnd.github.VERSION.raw")
        xhr.onload = function(e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                  var newVer = xhr.responseText
                  if(newVer !== $scope.version) $scope.version += ' |-> ' + newVer
                } else {
                  console.error(xhr.statusText)
                }
            }
        }
        xhr.onerror = function(e) {
            console.error(xhr.statusText)
        }
        xhr.send(null)


        $scope.$watch('flow', function(newVal, oldVal) {
            $scope.isSaved = false
        }, true)
        $scope.refreshSaved = function() {
            setTimeout(function() { //change to false after it starts
                $scope.isSaved = true
                $scope.$apply()
            }, 100)
        }
        $scope.refreshSaved()
        $scope.openFromLS = function(n) {
            var transaction = db.transaction(["flows"], "readwrite")
            transaction.onerror = function(event) {
                alert('Error, opening flow failed!', 4000) // 4000 is the duration of the toast
            }
            var objectStore = transaction.objectStore("flows")
            var request = objectStore.get(n)
            request.onsuccess = function(event) {
                $scope.flow = event.target.result
                $scope.key = n
                $scope.isSaved = true
                $scope.$apply()
                $scope.refreshSaved()
            }
            $('#lsManagerModal').modal('close')
        }
        $scope.save = function() {
            if (indexedDB) { //only if indexedDB can we actually save these files
                if ($scope.key === 0) { //saving new file
                    var transaction = db.transaction(["flows"], "readwrite")
                    transaction.oncomplete = function(event) {
                        Materialize.toast('Saved', 2000) // 4000 is the duration of the toast
                    }
                    transaction.onerror = function(event) {
                        alert('Error, not saved!', 4000) // 4000 is the duration of the toast
                    }
                    var objectStore = transaction.objectStore("flows")
                    var request = objectStore.add($scope.flow)
                    request.onsuccess = function(event) {
                        $scope.key = event.target.result
                        $scope.refreshSaved()
                    }
                } else { //updating old flow
                    var objectStore = db.transaction(["flows"], "readwrite").objectStore("flows")
                    var data = event.target.result;
                    data = $scope.flow
                    var requestUpdate = objectStore.put(data, $scope.key)
                    requestUpdate.onerror = function(event) {
                        console.log('error in updating flow data to database')
                    }
                    requestUpdate.onsuccess = function(event) {
                        Materialize.toast('Flow updated', 3000)
                        $scope.refreshSaved()
                    }
                }
                $scope.$broadcast('loadFlows', null)
            } else {
                Materialize.toast('Needs indexedDB', 4000) // 4000 is the duration of the toast
            }
        }
        $scope.newFlow = function() {
            if ($scope.isSaved) {
                $scope.flow = {}
                $scope.flow.dataL = []
                $scope.flow.leftTeam = ''
                $scope.flow.dataR = []
                $scope.flow.rightTeam = ''
                $scope.flow.title = ''
                $scope.key = 0
                $scope.refreshSaved()
            } else {
                $('#unsavedModal').modal('open')
            }
        }
        $scope.forceNewFlow = function() {
            $scope.isSaved = true
            $scope.newFlow()
            $('#unsavedModal').modal('close')
            $scope.refreshSaved()
        }
        $scope.lsManagerOpen = function() {
            if (indexedDB) {
                console.log('broadcasting load flows')
                $scope.$broadcast('loadFlows', null)
                $('#lsManagerModal').modal('open')
            } else {
                Materialize.toast('Needs indexedDB', 4000) // 4000 is the duration of the toast
            }
        }
        $scope.info = function() {
            $('#infoModal').modal('open')
        }
        $scope.emitExpand = function() {
            $scope.$broadcast('toggleExpand', null)
        }

        function makeTextFile(text) {
            var data = new Blob([text], {
                type: 'octet/stream'
            })
            return window.URL.createObjectURL(data)
        }
    }])
    .controller('lsManager', ['$scope', function($scope) {
        $scope.$on('loadFlows', function(events, args) {
            $scope.flowTable = []
            var request = db.transaction(["flows"]).objectStore("flows").getAll()
            request.onerror = function(event) {
                //TODO: be sad
            }
            request.onsuccess = function(event) {
                for (var i = 0; i < event.target.result.length; i++) {
                    var f = event.target.result[i]
                    if (f) $scope.flowTable.push({
                        name: f.title,
                        teamL: f.leftTeam,
                        teamR: f.rightTeam
                    })
                }
                if ($scope.flowTable.length === 0) {
                    $scope.message = "No flows exist in local storage."
                    $scope.$apply()
                } else {
                    var requestKeys = db.transaction(["flows"]).objectStore("flows").getAllKeys()
                    requestKeys.onsuccess = function(event) { //indexeddb getall does not return keys with the objects, have to add keys to the entry after
                        for (var i = 0; i < event.target.result.length; i++) {
                            var f = event.target.result[i]
                            $scope.flowTable[i].id = f
                        }
                        $scope.$apply()
                    }
                }
            }
        })
        $('.dropdown-button').dropdown({
            inDuration: 300,
            outDuration: 225,
            constrain_width: false, // Does not change width of dropdown to that of the activator
            hover: false, // Activate on hover
            gutter: 0, // Spacing from edge
            belowOrigin: false, // Displays dropdown below the button
            alignment: 'left' // Displays dropdown with edge aligned to the left of button
        })
        $scope.open = function(n) {
            $scope.$parent.openFromLS(n)
        }
        $scope.beginDelete = function(n) {
            $scope.deleting = n
            $('#delConfirmation').modal('open')
        }
        $scope.completeDelete = function() {
            var request = db.transaction(["flows"], "readwrite").objectStore("flows").delete($scope.deleting)
            request.onerror = function(event) {
                //TODO: be sad
            }
            request.onsuccess = function(event) {
                $scope.$broadcast('loadFlows', null)
            }
        }
    }])
    .controller('infoModal', ['$scope', function($scope) {
        $scope.serviceWorker = 'serviceWorker' in navigator ? true : false
        $scope.indexedDB = indexedDB ? true : false
    }])
    .config([
        '$compileProvider',
        function($compileProvider) {
            $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|file|blob|mailto|chrome-extension):/);
        }
    ])
    .directive('box', function() {
        return {
            restrict: 'AE',
            scope: {
                tag: '=',
                text: '=',
                type: '=',
                index: '=boxindex',
                removeBox: '&boxrm'
            },
            controller: function() {
                this.color = function(type, critical) {
                    var style = ''
                    if (type == 'extension') style = 'blue'
                    if (type == 'response') style = 'red'
                    if (type == 'arrow') style = 'green'
                    if (critical) {
                        style += ' boxCriticalBorder'
                    } else {
                        style += ' accent-1'
                    }
                    return style
                }
                this.rmbox = function() {
                    this.removeBox({
                        index: this.index
                    })
                }
                this.critical = false
                this.toggleCritical = function() {
                    this.critical = !this.critical
                }
                this.isCritical = function() {
                    if (this.critical) return 'boxCriticalBorder'
                    return ''
                }
                this.getStyle = function(type) {
                    return this.color(type, this.isCritical())
                }
            },
            controllerAs: 'b',
            bindToController: true,
            templateUrl: 'templates/box.html'
        }
    })
    .directive('arguement', function() {
        return {
            restrict: 'AE',
            transclude: true,
            scope: {
                boxes: '=',
                index: '=argindex',
                removeArgument: '&argrm'
            },
            controller: function() {
                $('.tooltipped').tooltip()
                this.extend = function() {
                    this.boxes.push({
                        "type": "extension",
                        "text": ""
                    })
                }
                this.respond = function() {
                    this.boxes.push({
                        "type": "response",
                        "text": ""
                    })
                }
                this.arrow = function() {
                    this.boxes.push({
                        "type": "arrow"
                    })
                }
                this.removeBox = function(index) {
                    this.boxes.splice(index, 1)
                }
                this.rmarg = function() {
                    $('.tooltipped').tooltip('remove') //closes then reinitializes all the tooltips
                    $('.tooltipped').tooltip()
                    this.removeArgument({
                        index: this.index
                    })
                }
            },
            controllerAs: 'a',
            bindToController: true,
            templateUrl: 'templates/arg.html'
        }
    })
    .directive('contention', function() {
        return {
            restrict: 'E',
            scope: {
                args: '=',
                name: '=',
                index: '=contindex',
                removeContention: '&contrm'
            },
            controller: function() {
                $('.tooltipped').tooltip()
                this.newArg = function() {
                    this.args.push([{
                        "title": "",
                        "text": "",
                        "type": "constructive"
                    }])
                }
                this.removeArgument = function(index) { //removing arguement from contention
                    this.args.splice(index, 1)
                }
                this.rmcont = function() { //remove contention called from the contention
                    $('.tooltipped').tooltip('remove')
                    $('.tooltipped').tooltip()
                    this.removeContention({
                        index: this.index
                    })
                }
            },
            controllerAs: 'c',
            bindToController: true,
            templateUrl: 'templates/contention.html'
        }
    })
    .directive('flow', function() {
        return {
            restrict: 'E',
            scope: {
                data: '=',
                id: '@',
                team: '='
            },
            controller: function() {
                this.expand = false
                this.toggleExpand = function() {
                    this.expand = !this.expand
                }
                this.isExpanded = function() {
                    if (this.expand) return 'flowExpanded flow'
                    else return 'flow'
                }
                this.newContention = function() {
                    this.data.push({
                        "title": "",
                        "args": []
                    })
                }
                this.removeContention = function(index) {
                    this.data.splice(index, 1)
                }
            },
            link: function(scope, element, attr, ctrl) {
                scope.$on('toggleExpand', function(events, args) {
                    ctrl.toggleExpand()
                })
            },
            controllerAs: 'f',
            bindToController: true,
            templateUrl: 'templates/flow.html'
        }
    })
