const {
    HubConnectionBuilder,
    HttpTransportType,
    LogLevel,
  } = require('@aspnet/signalr');

const SUBSCRIBE_DEVICES_UPDATES = 'SubscribeDevicesUpdates';
const DEVICE_UPDATED = 'DeviceUpdated';
const DEVICE_ADDED = 'DeviceAdded';

class Operator {
    constructor(deviceManagementUrl, devicesId) {     
        this.devicesId = devicesId;
this.hubConnection = new HubConnectionBuilder()
  .withUrl(deviceManagementUrl, {
    skipNegotiation: true,
    transport: HttpTransportType.WebSockets,
  })
  .configureLogging(LogLevel.Information)
  .build();
}

connectOperator(){
  this.hubConnection
  .start()
  .then(()=>{
    this.hubConnection.on(DEVICE_UPDATED, (updates) => this.onDeviceUpdated(updates));
    this.hubConnection.on(DEVICE_ADDED, (addedDevice) => this.onDeviceAdded(addedDevice));
    this.subscribeToDeviceChanges(this.devicesId);
  })
  .catch(() => console.error('Device management socket failed'));
}

updateDeviceEvent(){};
catchReciveDeviceUpdate(){};

  subscribeToDeviceChanges(ids = []) {
    return this.hubConnection.invoke(SUBSCRIBE_DEVICES_UPDATES, { Udids: ids });
  }

  unsubscribeFromDeviceChanges() {
    return this.hubConnection.invoke(SUBSCRIBE_DEVICES_UPDATES, { Udids: [] });
  }
  onDeviceUpdated(updates){
    this.catchReciveDeviceUpdate();
    let count = Number(document.getElementById('UpdatedFieldId').innerText);
    document.getElementById('UpdatedFieldId').innerText = count + 1;
  }

  onDeviceAdded(addedDevice){
  }

  disconnect() {
      this.hubConnection.off(DEVICE_UPDATED);
      this.hubConnection.off(DEVICE_ADDED);
      return this.hubConnection.stop();
    }

}

module.exports = {
  createOperator: (deviceManagementUrl, devices) => new Operator(deviceManagementUrl, devices),
};