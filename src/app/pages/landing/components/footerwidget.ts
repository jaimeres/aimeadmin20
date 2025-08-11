import { Component } from '@angular/core';

@Component({
  selector: 'footer-widget',
  standalone: true,
  template: `<div class="grid grid-cols-12 gap-4 lg:gap-0 lg:grid-nogutter pb-12">
    <div class="col-span-12 lg:col-span-3">
      <div class="w-full text-white flex flex-col gap-4">
        <h1 class="m-0 font-medium text-sm text-surface-500 dark:text-surface-300">CONTACT US</h1>
        <div class="flex gap-8">
          <a href="#"><i class="pi pi-github text-white text-2xl!"></i></a>
          <a href="#"><i class="pi pi-twitter text-white text-2xl!"></i></a>
          <a href="#"><i class="pi pi-linkedin text-white text-2xl!"></i></a>
        </div>
        <p class="m-0 text-base lg:text-sm">
          (415) 931-1624 794 Mcallister <br />
          St San Francisco, 94102
        </p>
        <span class="text-base lg:text-sm"> 2023</span>
      </div>
    </div>
    <div class="col-span-12 lg:col-span-3">
      <div class="w-full text-white flex flex-col gap-4">
        <h1 class="m-0 font-medium text-sm text-surface-500 dark:text-surface-300">ABOUT US</h1>
        <a href="#"><span class="text-base lg:text-sm block text-white">Our Values</span></a>
        <a href="#"><span class="text-base lg:text-sm block text-white">Our Team</span></a>
        <a href="#"><span class="text-base lg:text-sm block text-white">Our History</span></a>
        <a href="#"><span class="text-base lg:text-sm block text-white">Career & Join Us</span></a>
      </div>
    </div>
    <div class="col-span-12 lg:col-span-3">
      <div class="w-full text-white flex flex-col gap-4">
        <h1 class="m-0 font-medium text-sm text-surface-500 dark:text-surface-300">SITE MAP</h1>
        <a href="#"><span class="text-base lg:text-sm block text-white">Dashboard</span></a>
        <a href="#"><span class="text-base lg:text-sm block text-white">CRUD</span></a>
        <a href="#"><span class="text-base lg:text-sm block text-white">Invoice</span></a>
        <a href="#"><span class="text-base lg:text-sm block text-white">Help </span></a>
      </div>
    </div>
    <div class="col-span-12 lg:col-span-3">
      <div class="w-full text-white flex flex-col gap-4">
        <h1 class="m-0 font-medium text-sm text-surface-500 dark:text-surface-300">CALENDAR</h1>
        <a href="#"><span class="text-base lg:text-sm block text-white">Widgets</span></a>
        <a href="#"><span class="text-base lg:text-sm block text-white">Documentation</span></a>
        <a href="#"><span class="text-base lg:text-sm block text-white">Buy Now</span></a>
      </div>
    </div>
  </div>`,
  host: {
    style: 'max-width: 1200px',
    class: 'w-full px-6'
  }
})
export class FooterWidget {}
