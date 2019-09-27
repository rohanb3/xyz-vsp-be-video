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
let operatorsArr = [];
let arr = [];
let arrID = [];
let sendUpdateMin;
let sendUpdateMax;
let operatorCount;

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
   
   if(operatorsArr){
    operatorsArr.forEach(function(entry) {
      entry.disconnect();
    });
   }

   document.getElementById('authorizeFieldId').innerText = 0;
   document.getElementById('updateFieldId').innerText = 0;
   document.getElementById('UpdatedFieldId').innerText = 0;
   arr = [];
   arrID = [];
 }

 function takeFieldsValueFromPage(){
  deviceCount = document.querySelector('#deviceCountGenID').value
  sendUpdateMin = document.querySelector('#sendUpdateMinID').value;
  sendUpdateMax = document.querySelector('#sendUpdateMaxID').value;
  operatorCount = document.querySelector('#operatorCountID').value;
 }

function startTest(){
takeFieldsValueFromPage();

  for (let i = 0; i < deviceCount; i++) {   
    let deviceId = uuid.v4();
    let requestTimeDelay = random(sendUpdateMin, sendUpdateMax);
    let deviceManagementUrl = `${deviceManagementDevicePath}?udid=${deviceId}`;
    let device = createDevice(deviceId, deviceManagementUrl, requestTimeDelay);
    arr.push(device);
    arrID.push(deviceId);
  }

  for (let i = 0; i < operatorCount; i++) {   
    let operator = createOperator(deviceManagementOperatorPath, arrID);
    operatorsArr.push(operator);
  }
  
}

function updateTest(){
  if(arr){
    arr.forEach(async function(entry) {
      await entry.sendDeviceInfo();     
    });
   }
}

function random(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}