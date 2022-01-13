import { Component } from '@angular/core';

declare var foo;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'HubSpot - Contact Management';
  connectButton = 'Connect with HubSpot';
  disconnectButton = 'Disconnect';
  name = "Fatema";
}
