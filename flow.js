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
            console.log('ServiceWorker registration successful with scope: ', registration.scope)
        }).catch(function(err) {
            // registration failed :(
            //TODO: add a browser error notif
            console.log('ServiceWorker registration failed: ', err)
        })
    })
} else {
    //TODO: add a browser error notif
    alert('Flow requires a browser with indexedDB and service workers')
}

var angular = require('angular')
require('ng-file-upload')
require('angular-animate')
var flowApp = angular.module('Flow', ['ngFileUpload', 'ngAnimate'])
    .controller('flowCtrl', ['$scope', '$rootScope', '$timeout', function ($scope, $rootScope, $timeout) {
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
        $scope.version = '0.9.5'
        $scope.key = 0 //0 means unsaved, otherwise key in indexedDB
        $scope.isSaved = true
        var unwatchFlow = function () {}

        //check the most uptodate verion number mwahhahah
        var xhr = new XMLHttpRequest()
        xhr.open("GET", "https://api.github.com/repos/FastFlowDebate/Flow.FastFlowDebate/contents/package.json", true)
        xhr.setRequestHeader("Accept", "application/vnd.github.VERSION.raw")
        xhr.onload = function(e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var newVer = JSON.parse(xhr.responseText).version
                    console.log(newVer + ' ' + $scope.version)
                    if (newVer !== $scope.version) $scope.version += ' |-> ' + newVer
                } else {
                    console.error(xhr.statusText)
                }
            }
        }
        xhr.onerror = function(e) {
            console.error(xhr.statusText)
        }
        xhr.send(null)

        var firstLoad = true
        var watchFlow = function () {
           unwatchFlow =  $scope.$watch('flow', function(newVal, oldVal) {
             if (firstLoad) {
               $timeout(function (){
                 firstLoad = false
               })
             } else {
               $scope.isSaved = false //there is a dif so set false
               unwatchFlow() //delete itself
               unwatchFlow = function () {} //bind unwatch function to nothing until new watcher created in refreshSave()
             }
          }, true)
        }
        $scope.refreshSaved = function() {
            unwatchFlow() //delete old watcher
            watchFlow() //create new watcher and rebinds delete old watcher function
            $scope.isSaved = true
            firstLoad = true
        }
        $scope.refreshSaved()
        $scope.openFromLS = function(n) {
            $rootScope.fromSaved = true
            var transaction = db.transaction(["flows"], "readwrite")
            transaction.onerror = function(event) {
                alert('Error, opening flow failed!') // 4000 is the duration of the toast
            }
            var objectStore = transaction.objectStore("flows")
            var request = objectStore.get(n)
            request.onsuccess = function(event) {
                $scope.flow = event.target.result
                $scope.key = n
                $scope.isSaved = true
                $scope.$apply()
                $scope.refreshSaved()
                setTimeout(function () { //set from save back to false after it has hopefully finished loading
                  $rootScope.fromSaved = false
                  $('.tooltipped').tooltip()
                },400)
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
                        alert('Error, not saved!') // 4000 is the duration of the toast
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
          $scope.loadFlows()
        })
        $scope.loadFlows = function () {
          var request = db.transaction(["flows"]).objectStore("flows").getAll()
          request.onerror = function(event) {
              //TODO: be sad
          }
          request.onsuccess = function(event) {
              $scope.flowTable = []
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
        }
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
        $scope.download = function(id) {
            var transaction = db.transaction(["flows"], "readwrite")
            transaction.onerror = function(event) {
                alert('Error, opening flow failed!') // 4000 is the duration of the toast
            }
            var objectStore = transaction.objectStore("flows")
            var request = objectStore.get(id)
            request.onsuccess = function(event) {
                var href = makeTextFile(JSON.stringify({
                    flows: [event.target.result]
                }))
                var link = document.createElement('a')
                link.href = href
                link.download = "flow.json"
                link.style = "display: none;"
                document.body.appendChild(link)
                link.click()
                link.remove()
            }
        }
        function makeTextFile(text) {
            var data = new Blob([text], {
                type: 'octet/stream'
            })
            return window.URL.createObjectURL(data)
        }
        $scope.uploadFiles = function(files) {
          if (FileReader) {
            if (files && files.length) {
              for (i in files) {
                (function(file) {
                  var reader = new FileReader()
                  reader.onload = function(e) {
                      var file = JSON.parse(e.target.result)
                      var transaction = db.transaction(["flows"], "readwrite")
                      transaction.oncomplete = function(event) {
                          Materialize.toast('Uploaded', 2000) // 4000 is the duration of the toast
                          $scope.loadFlows()
                      }
                      transaction.onerror = function(event) {
                          alert('Error, not saved!', 4000) // 4000 is the duration of the toast
                      }
                      for (j in file.flows) {
                        (function(flow) {
                          transaction.objectStore("flows").add(flow).onsuccess = function(event) {
                            console.log('flow loaded')
                          }
                        })(file.flows[j])
                      }
                  }
                  reader.readAsText(file, "UTF-8");
                })(files[i])
              }
            }
          } else {
            alert('Uploading requires a browser with File Reader')
          }
        }
    }])
    .controller('infoModal', ['$scope', function($scope) {
        $scope.serviceWorker = 'serviceWorker' in navigator ? true : false
        $scope.indexedDB = indexedDB ? true : false
        $scope.fileReader = FileReader ? true : false
    }])
    .config([
        '$compileProvider',
        function($compileProvider) {
            $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|file|blob):/)
        }
    ])
    .directive('box', ['$rootScope', function ($rootScope) {
        return {
            restrict: 'AE',
            scope: {
                tag: '=',
                text: '=',
                type: '<',
                index: '<boxindex',
                argfocus: '&',
                removeBox: '&boxrm'
            },
            controller: function() {
                var b = this
                b.isFocused = false
                b.setfocus = function (focus) {
                  b.isFocused = focus //set itself to focused
                  b.argfocus({focus:focus}) //set parent arg to focused
                }
                b.color = function(type, critical) {
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
                b.rmbox = function() {
                    b.removeBox({
                        index: b.index
                    })
                }
                b.critical = false
                b.toggleCritical = function() {
                    b.critical = !b.critical
                }
                b.isCritical = function() {
                    if (b.critical) return 'boxCriticalBorder'
                    return ''
                }
                b.getStyle = function(type) {
                    return b.color(type, b.isCritical())
                }
            },
            link: function(scope, element, attr, ctrl) {
              //when box is created focus either the tagline if first box or the textarea
              setTimeout(function () {
                if(!$rootScope.fromSaved) { //if not being made from save focus it
                  if(ctrl.index == 0) { //TODO optimize so this only runs when new, not when opened from saved
                    element.find('.box__constructiveTitle__input').focus()
                  } else {
                    element.find('.box__textarea').focus()
                  }
                }
                element.find('.materialize-textarea').trigger("autoresize") //autoresize when created
              }, 50)
            },
            controllerAs: 'b',
            bindToController: true,
            templateUrl: 'templates/box.html'
        }
    }])
    .directive('arguement', ['$rootScope', function($rootScope) {
        return {
            restrict: 'AE',
            transclude: true,
            scope: {
                boxes: '=',
                index: '<argindex',
                removeArgument: '&argrm',
                contfocus: '&'
            },
            controller: ['$scope', function(scope) {
                var a = this
                a.isFocused = false
                a.add = function (which) {
                  switch (which) {
                    case 'defense' :
                      this.boxes.push({
                          "type": "extension",
                          "text": ""
                      })
                      break;
                    case 'response' :
                      this.boxes.push({
                          "type": "response",
                          "text": ""
                      })
                      break;
                    case 'extension' :
                      this.boxes.push({
                          "type": "arrow"
                      })
                      break;
                  }
                }
                a.removeBox = function(index) {
                    this.boxes.splice(index, 1)
                }
                a.rmarg = function() {
                    $('.tooltipped').tooltip('remove') //closes then reinitializes all the tooltips
                    this.removeArgument({
                        index: this.index
                    })
                    $('.tooltipped').tooltip()
                }
                a.argfocus = function (args) {
                  a.isFocused = args //set self focus to focus of box
                  a.contfocus({focus:JSON.stringify(a.isFocused)}) //update contention to focus of self
                }
                scope.$on('boxDefend', function(events, args) {
                  if (a.isFocused) a.add('defense')
                })
                scope.$on('boxRespond', function(events, args) {
                  if (a.isFocused) a.add('response')
                })
                scope.$on('boxExtend', function(events, args) {
                  if (a.isFocused) a.add('extension')
                })
                scope.$on('shiftArg', function(events, args) {
                  if (a.isFocused) { // check that this arg should act
                    scope.$emit('newContentionFromData', a.boxes) // send data for new contention
                    a.rmarg() //remove self
                  }
                })
            }],
            link: function(scope, element, attr, ctrl) {
              if (!$rootScope.fromSaved) $('.tooltipped').tooltip() //only fix the tooltips if new
            },
            controllerAs: 'a',
            bindToController: true,
            templateUrl: 'templates/arg.html'
        }
    }])
    .directive('contention', ['$rootScope', function($rootScope) {
        return {
            restrict: 'E',
            scope: {
                args: '=',
                name: '=',
                index: '<contindex',
                removeContention: '&contrm'
            },
            controller: function() {
                var c = this
                c.isFocused = false

                c.newArg = function() {
                    c.args.push([{
                        "title": "",
                        "text": "",
                        "type": "constructive"
                    }])
                }
                c.removeArgument = function (index) { //removing arguement from contention
                    c.args.splice(index, 1)
                }
                c.rmcont = function() { //remove contention called from the contention
                    $('.tooltipped').tooltip('remove')
                    c.removeContention({
                        index: c.index
                    })
                    $('.tooltipped').tooltip()
                }
                c.setfocus = function (args) {
                  c.isFocused = args //set self focus to focus of box
                }
            },
            link: function(scope, element, attr, ctrl) {
              scope.$on('newArugment', function(events, args) {
                    if (ctrl.isFocused) ctrl.newArg() //not really a way to link in here as no focus
              })
              if(!$rootScope.fromSaved) {
                $('.tooltipped').tooltip()
                element.find('.contention__input').focus() //focus the input bar when created
              }
            },
            controllerAs: 'c',
            bindToController: true,
            templateUrl: 'templates/contention.html'
        }
    }])
    .directive('flow', function() {
        return {
            restrict: 'E',
            scope: {
                data: '=',
                id: '<',
                team: '='
            },
            controller: ['$scope', '$timeout', function($scope, $timeout) {
                var f = this
                f.expand = false
                f.toggleExpand = function() {
                    f.expand = !f.expand
                }
                f.isExpanded = function() {
                    if (f.expand) return 'flowExpanded flow'
                    else return 'flow'
                }
                f.newContention = function() {
                    f.data.push({
                        "title": "",
                        "args": []
                    })
                }
                f.newContentionFromData = function(boxes) { // using scope not this to remain accessible within $on
                    f.data.push({
                        "title": "",
                        "args": [boxes]
                    })
                }
                f.removeContention = function(index) {
                    f.data.splice(index, 1)
                }

                //Hot Key functionality
                f.altDown = false
                var isCoolDown = false
                f.keydown = function (keyID) {
                  if(!isCoolDown){
                    // sets altDown to true if the shift key (key code is 16) is pressed
                    keyCode = keyID.keyCode
                    if (keyCode === 18) {
                        f.altDown = true
                    }
                    if (keyCode === 16) {
                        f.shiftDown = true
                    }
                    // sends the message if "enter" is pressed and "alt" is being held down
                    if(keyCode === 49 && f.altDown) {
                      //new contention
                        event.preventDefault()
                        f.newContention()
                    } else if(keyCode === 50 && f.altDown) {
                      //new arguement
                        event.preventDefault()
                        $scope.$broadcast('newArugment')
                    } else if(keyCode === 51 && f.altDown) {
                      //defend
                        event.preventDefault()
                        $scope.$broadcast('boxDefend')
                    } else if(keyCode === 52 && f.altDown) {
                      //respond
                        event.preventDefault()
                        $scope.$broadcast('boxRespond')
                    } else if(keyCode === 53 && f.altDown) {
                      //extend
                        event.preventDefault()
                        $scope.$broadcast('boxExtend')
                    } else if(keyCode === 13 && f.shiftDown) {
                        event.preventDefault()
                        $scope.$broadcast('shiftArg')
                    } else if(keyCode === 13) {
                        event.preventDefault()
                        $scope.$broadcast('newArugment')
                    }
                    isCooldown = true
                    $timeout(function () {
                      isCooldown = false
                    }, 300);
                  }
                }
                // sets altDown/shiftDown to false if the alt key has been released
                f.keyup = function (keyID) {
                    if(keyID.keyCode === 18) {
                        f.altDown = false
                    } else if (keyID.keyCode === 16) {
                      f.shiftDown = false
                    }
                }
            }],
            link: function(scope, element, attr, ctrl) {
                scope.$on('toggleExpand', function(events, args) {
                    ctrl.toggleExpand()
                })
                scope.$on('newContentionFromData', function(events, args) {
                  console.log('new contention from data?')
                  ctrl.newContentionFromData(args)
                })
            },
            controllerAs: 'f',
            bindToController: true,
            templateUrl: 'templates/flow.html'
        }
    })
    .directive('confirmbutton', function() {
        return {
            //This is heavily WIP
            restrict: 'E',
            scope: {
                callback: '&',
                icon: '@',
                duration: '@'
            },
            controller: function() {
                this.active = false

                this.enter = function() {
                    this.active = true
                }
                this.leave = function() {
                    this.active = false
                }
            },
            link: function(scope, element, attr, ctrl) {

            },
            controllerAs: 'c',
            bindToController: true,
            templateUrl: 'templates/confirmButton.html'
        }
    })
    .directive('mAppLoading', ['$animate', function($animate) {
                    return({
                        link: function (scope, element, attributes) {
                          $animate.leave(element.children().eq(0)).then( //remove itself on link function which is end of loading scren
                              function cleanupAfterAnimation () {
                                  element.remove()
                                  scope = element = attributes = null
                              }
                          )
                        },
                        restrict: "C"
                    })

                }])
