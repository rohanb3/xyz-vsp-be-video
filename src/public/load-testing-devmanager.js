const uuid = require('uuid');
const { createDevice } = require('./device-to-devmanager');
const { createOperator } = require('./operator-to-devmanager');

const isLocal = typeof prompt('Is local?') === 'string';
const isDev = !isLocal && typeof prompt('Is dev?') === 'string';
const isStage = !isLocal && !isDev && typeof prompt('Is stage?') === 'string';
let deviceManagementHost = 'http://127.0.0.1:8085';
let operator;
let deviceCount;

if(isDev){
    deviceManagementHost = 'https://dev-portal.xyzvsp.com';
}

if (isStage) {
  deviceManagementHost = 'https://stage-portal.xyzvsp.com';
}

const deviceManagementDevicePath = isLocal ? `${deviceManagementHost}/deviceSocket` : `${deviceManagementHost}/api/device-management-api/deviceSocket`;
const deviceManagementOperatorPath = isLocal ? `${deviceManagementHost}/operatorSocket` : `${deviceManagementHost}/api/device-management-api/operatorSocket`;
let arr = [];
let arrID = [];

subscribeToControls();

function subscribeToControls() {
    document.querySelector('.start-button').addEventListener('click', startTest);
    document.querySelector('.clear-button').addEventListener('click', clearTest);
    document.querySelector('.update-button').addEventListener('click', updateTest);
  }

 function clearTest () {
   if(arr){
    arr.forEach(function(entry) {
      entry.disconnect();
    });
   }
   operator.disconnect();

   document.getElementById('authorizeFieldId').innerText = 0;
   document.getElementById('updateFieldId').innerText = 0;
   document.getElementById('UpdatedFieldId').innerText = 0;
   arr = [];
   arrID = [];
 }

 function takeFieldsValueFromPage(){
  deviceCount = document.querySelector('#deviceCountGenID').value
 }

function startTest(){
takeFieldsValueFromPage();

  for (let i = 0; i < deviceCount; i++) {   
    let deviceId = uuid.v4();
    let deviceManagementUrl = `${deviceManagementDevicePath}?udid=${deviceId}`;
    let device = createDevice(deviceId, deviceManagementUrl);
    arr.push(device);
    arrID.push(deviceId);
  }

  operator = createOperator(deviceManagementOperatorPath, arrID);
}

function updateTest(){
  if(arr){
    arr.forEach(function(entry) {
      entry.sendDeviceInfo();
    });
   }
}