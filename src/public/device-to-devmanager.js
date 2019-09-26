const {
    HubConnectionBuilder,
    HttpTransportType,
    LogLevel,
  } = require('@aspnet/signalr');

class Device {
    constructor(deviceId, deviceManagementUrl) {
      this.deviceId = deviceId;       
      this.hubConnection = new HubConnectionBuilder()
      .withUrl(deviceManagementUrl, {
        skipNegotiation: true,
        transport: HttpTransportType.WebSockets,
      })
      .configureLogging(LogLevel.Information)
      .build();
      
      this.hubConnection
      .start()
      .then(()=>{
        let count = Number(document.querySelector('#authorizeFieldId').innerText);
        document.querySelector('#authorizeFieldId').innerText = count + 1;
      })
      .catch(() => console.error('Device management socket failed'));
    }

    sendDeviceInfo() {
      let salesRepId = '68D4FC28-08A4-4B09-AF00-86A3713EA2A3';
      this.hubConnection.invoke('UpdateSalesRep', {
        salesRepId,
      }).then(()=>{
        let count = Number(document.querySelector('#updateFieldId').innerText);
        document.querySelector('#updateFieldId').innerText = count + 1;
      });
      
  }

  disconnect(){
    this.hubConnection.stop();
  }
}

module.exports = {
  createDevice: (deviceId, deviceManagementUrl) => new Device(deviceId, deviceManagementUrl),
};