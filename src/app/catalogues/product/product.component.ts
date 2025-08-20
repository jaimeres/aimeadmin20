import { Component, OnInit, signal } from '@angular/core';
import { CRUD } from '../../utils/crud.class';
import { MenuItem } from 'primeng/api';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-product',
  imports: [],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss',
  standalone: true
})
export class ProductComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Artículo',
    command: () => this.openNewProduct()
  }, {
    label: 'Alterno equivalente',
    command: () => this.openNew({ pos: 'alternate-equivalent' })
  }, {
    label: 'Variante',
    command: () => this.openNew({ pos: 'product-variation' })
  }, {
    label: 'Web',
    command: () => this.openNew({ pos: 'web-product' })
  }
  ]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Artículos',
    command: () => this.getAll({ pos: 'product' })
  }, {
    label: 'Alternos y equivalentes',
    command: () => this.getAll({ pos: 'alternate-equivalent' })
  }, {
    label: 'Variantes',
    command: () => this.getAll({ pos: 'product-variation' })
  }, {
    label: 'Web',
    command: () => this.getAll({ pos: 'web-product' })
  }
  ]);

  constructor(crudS: ProductService) {
    super(crudS, 'product');
  }

  ngOnInit(): void {
    this.initCRUD();
  }

  openNewProduct() {
    this.veryfySlotItemsSecundary();
    this.openNew({ pos: 'product', filter: 'filter[is_alternate]=false' });
  }

  veryfySlotItemsSecundary() {
    const itemsSec: { [key: string]: any } = this.itemsSecundary();
    if (itemsSec['slot'] === undefined) {
      itemsSec['slot'] = [];
      this.getAllSecundary({ pos: 'slot', app: 'companies/slot', type: 'slot' });
    }
  }

}
