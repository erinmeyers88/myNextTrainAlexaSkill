'use strict';
var Alexa = require('alexa-sdk');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var concat = require('concat-stream');
var http = require('http');

var APP_ID = 'amzn1.ask.skill.c8cbde58-d656-403d-ba44-85675fa00b95';
var SKILL_NAME = 'UTA Tracker';

exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
        this.emit('GetNextTrain');
    },
    'GetNextTrainIntent': function () {
        this.emit('GetNextTrain');
    },
    'GetNextTrain': function () {

        var self = this;

        var stopMonitoring = 'http://api.rideuta.com/SIRI/SIRI.svc/StopMonitor?stopid=801163&minutesout=360&onwardcalls=true&filterroute=750&usertoken=URCONBJBKGE&scheduled=true&predictive=true';

        var vehicleMonitoring = 'http://api.rideuta.com/SIRI/SIRI.svc/VehicleMonitor/ByRoute?route=750&onwardcalls=true&usertoken=URCONBJBKGE';

        http.get(stopMonitoring, function (resp) {
            resp.pipe(concat(function (buffer) {
                var str = buffer.toString();
                parser.parseString(str, function (err, result) {

                    var trains = result.Siri.StopMonitoringDelivery[0].MonitoredStopVisit[0].MonitoredVehicleJourney;

                    var totalTrains = trains.length;

                    var totalTrainsPhrase = 'There are ' + totalTrains + ' trains passing Orem station in the next two hours.';

                    var trainSentences = '';

                    trains.map(function (train) {
                        var trainStatus;
                        switch (train.ProgressRate[0]) {
                            case '0':
                                trainStatus = 'an early train';
                                break;
                            case '1':
                                trainStatus = 'an on time train';
                                break;
                            case '2':
                                trainStatus = 'a late train';
                                break;
                            case '3':
                                trainStatus = 'a train over ten minutes late';
                                break;
                            case '4':
                                trainStatus = 'a train over ten minutes early';
                                break;
                            case '5':
                                trainStatus = 'a train';
                                break;
                        }

                        var direction = train.MonitoredCall[0].Extensions[0].Direction[0];
                        var departureTime = Math.round(train.MonitoredCall[0].Extensions[0].EstimatedDepartureTime[0] / 60);
                        var oneTrainPhrase = ' There is ' + trainStatus +  ' going from Orem ' + direction + ' in ' + departureTime + ' minutes.';
                        trainSentences = trainSentences.concat(oneTrainPhrase);
                    });

                    var spokenPhrase = totalTrainsPhrase + ' ' + trainSentences;
                    self.emit(':tellWithCard', spokenPhrase, SKILL_NAME, spokenPhrase);

                });
            }));
        });

    },
    'AMAZON.HelpIntent': function () {
        var speechOutput = "You can say get my next train, or, you can say exit... What can I help you with?";
        var reprompt = "What can I help you with?";
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', 'Goodbye!');
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', 'Goodbye!');
    }
};