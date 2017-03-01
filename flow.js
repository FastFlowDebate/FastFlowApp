window.jQuery = require('jquery')
require('materialize-css/js/initial')
require('materialize-css/js/jquery.easing.1.3')
require('materialize-css/js/animation')
window.Vel = require('materialize-css/js/velocity.min')
require('materialize-css/js/hammer.min')
require('materialize-css/js/jquery.hammer')
require('materialize-css/js/global')
require('materialize-css/js/dropdown')
require('materialize-css/js/modal')
require('materialize-css/js/toasts')
require('materialize-css/js/tooltip')

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
        $('#delConfirmation').modal()

        $scope.flow = {}
        $scope.flow.dataL = []
        $scope.flow.leftTeam
        $scope.flow.dataR = []
        $scope.flow.rightTeam
        $scope.flow.title
        $scope.version = '1.6.4'
        $scope.key = 0 //0 means unsaved, otherwise key in indexedDB
        $scope.isSaved = true

        $scope.$watch('flow', function (newVal, oldVal) {
          $scope.isSaved = false
        }, true)
        setTimeout(function () {//change to false after it starts
          $scope.isSaved = true
          $scope.$apply()
        }, 800)
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
                    }
                }
                $scope.$broadcast('loadFlows', null)
            } else {
                Materialize.toast('Needs indexedDB', 4000) // 4000 is the duration of the toast
            }
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
        $scope.emitExpand = function () {
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
                  teamR: f.rightTeam,
                  id: i + 1
                })
            }
            console.log('flows:')
            console.log($scope.flowTable)
            if ($scope.flowTable.length === 0) $scope.message = "No flows exist in local storage."
            $scope.$apply()
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
                        index: this.boxindex
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
                removeArguement: '&argrm'
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
                    this.removeArguement({
                        index: this.argindex
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
                name: '='
            },
            controller: function() {
                this.newArg = function() {
                    this.args.push([{
                        "title": "",
                        "text": "",
                        "type": "constructive"
                    }])
                }
                this.removeArguement = function(index) {
                    this.args.splice(index, 1)
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
