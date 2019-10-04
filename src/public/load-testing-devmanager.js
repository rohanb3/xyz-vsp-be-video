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
let devPerOperator;
const now = Date.now();

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

   removeUsers();
 }

 function takeFieldsValueFromPage(){
  deviceCount = document.querySelector('#deviceCountGenID').value
  sendUpdateMin = document.querySelector('#sendUpdateMinID').value;
  sendUpdateMax = document.querySelector('#sendUpdateMaxID').value;
  operatorCount = Number(document.querySelector('#operatorCountID').value);
  devPerOperator = Number(document.querySelector('#devPerOperatorID').value);
 }

async function startTest(){
takeFieldsValueFromPage();

  await registrationDevices();

  drawOperatorsFrames();  

}

function registrationDevices() {
  return new Promise((resolve, reject) => {
    for (let i = 0; i < deviceCount; i++) {
      let deviceId = uuid.v4();
      let requestTimeDelay = random(sendUpdateMin, sendUpdateMax);
      let deviceManagementUrl = `${deviceManagementDevicePath}?udid=${deviceId}`;
      let device = createDevice(deviceId, deviceManagementUrl, requestTimeDelay);
      arr.push(device);
      arrID.push(deviceId);
    }
    resolve();
  });
}

function updateTest(){
  if(arr){
    arr.forEach(async function(devEntry) {
      await devEntry.sendDeviceInfo().then(()=>{
        operatorsArr.forEach(function(opEntry){
          if(opEntry.devicesId.includes(devEntry.deviceId)){
            opEntry.updateDeviceEvent();
          }
        });     
      });
    });
   }
}

function random(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElements(sourceArray, neededElements) {
  let result = [];
  for (var i = 0; i < neededElements; i++) {
    const random = sourceArray[Math.floor(Math.random()*sourceArray.length)];
    result.includes(random) ? i-- : result.push(random);
  }
  return result;
}

function drawOperatorsFrames() {
  const parent = document.querySelector('.operators-section');
  const fragment = document.createDocumentFragment();

  new Array(operatorCount).fill(1).forEach((_, i) => {
    let devArrayId = getRandomElements(arrID, devPerOperator);
    let operator = createOperator(deviceManagementOperatorPath, devArrayId);
    operatorsArr.push(operator);

    const iframe = document.createElement('iframe');
    const num = i + 1;
    const frameContent = `
      <html>
        <body>
          <p style="margin: 0; text-align: center">
            <span id="deviceFollowCountId">0</span> /
            <span id="deviceUpdateSentCountId">0</span> /
            <span id="operatorReciveCountId">0</span>
            <span class="peer-id"></span>
          </p>
          <script src="/js/operator-devman-wrapper.js"></script>
        </body>
      </html>
    `;

    iframe.id = `operator-${num}`;
    iframe.classList.add('user-frame', 'operator-frame');
    iframe.srcdoc = frameContent;
    setTimeout(() => {
      iframe.contentWindow.operator = operator;
      iframe.contentWindow.userIdentity = `${now}-operator-${num}`;
    });
    fragment.appendChild(iframe);
  });

  parent.appendChild(fragment);
}

function removeUsers() {
  removeFrames('.operators-section');
}

function removeFrames(selector) {
  const iframes = document.querySelectorAll(`${selector} iframe`);
  for (var i = 0; i < iframes.length; i++) {
    iframes[i].parentNode.removeChild(iframes[i]);
  }
}

