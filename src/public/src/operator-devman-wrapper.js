const {
    operator,
  } = window;

document.getElementById('deviceFollowCountId').innerText = operator.devicesId.length;

operator.connectOperator();

operator.updateDeviceEvent = function(){
    let count = Number(document.getElementById('deviceUpdateSentCountId').innerText);
    document.getElementById('deviceUpdateSentCountId').innerText = count + 1;
}

operator.catchReciveDeviceUpdate = function(){
    let count = Number(document.getElementById('operatorReciveCountId').innerText);
    document.getElementById('operatorReciveCountId').innerText = count + 1;
}