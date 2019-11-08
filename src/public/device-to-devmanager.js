const {
    HubConnectionBuilder,
    HttpTransportType,
    LogLevel,
  } = require('@aspnet/signalr');

  const PING_INTERVAL = 30 * 1000;

class Device {
    constructor(deviceId, deviceManagementUrl, requestTimeDelay) {
      this.deviceId = deviceId;  
      this.requestTimeDelay = requestTimeDelay;      
      this.hubConnection = new HubConnectionBuilder()
      .withUrl(deviceManagementUrl, {
        skipNegotiation: true,
        transport: HttpTransportType.WebSockets,
      })
      .configureLogging(LogLevel.Information)
      .build();
      
      setTimeout(async ()=>{
        this.hubConnection
        .start()
        .then(()=>{
          this.startPing();
          let count = Number(document.querySelector('#authorizeFieldId').innerText);
          document.querySelector('#authorizeFieldId').innerText = count + 1;
        })
        .catch(() => {
          console.error('Device management socket failed');
          clearInterval(this._pingTimer);
        });
      }, 50); 
    }

    sendDeviceInfo() {
      let salesRepId = '68D4FC28-08A4-4B09-AF00-86A3713EA2A3';
      return new Promise((resolve, reject) => {
        setTimeout(async ()=>{
          await this.hubConnection
            .invoke('UpdateSalesRep', {
              salesRepId,
            })
            let count = Number(document.querySelector('#updateFieldId').innerText);
            document.querySelector('#updateFieldId').innerText = count + 1;
            resolve();          
        }, this.requestTimeDelay); 
      })         
  }

  disconnect(){
    this.hubConnection.stop();
    clearInterval(this._pingTimer);
  }

  startPing() {
    this._pingTimer = setInterval(() => this.hubConnection
            .invoke('PingFromClientSide', '1'), PING_INTERVAL);
  }
}


module.exports = {
  createDevice: (deviceId, deviceManagementUrl, requestTimeDelay) => new Device(deviceId, deviceManagementUrl, requestTimeDelay),
};