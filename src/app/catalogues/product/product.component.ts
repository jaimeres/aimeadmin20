import { Component, OnInit, signal } from '@angular/core';
import { CRUD } from '../../utils/crud.class';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ProductService } from '../services/product.service';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { PRIME_MODULES } from '../../shared/primeng.index';
import { LOCAL_BASE } from '../../shared/components.index';

@Component({
  selector: 'app-product',
  imports: [
    CommonModule,
    TagModule,
    TableModule,
    SelectModule,
    ...PRIME_MODULES,
    ...LOCAL_BASE,
  ],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss',
  standalone: true,
  providers: [ConfirmationService]
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

    //Inicializa los valores por defecto
    this.typeDefault = 'product';
    this.app[this.typeDefault] = 'products/product'
    this.module[this.typeDefault] = 'P';

    this.excludeFieldsForm[this.typeDefault] = [
      { field: 'classifiers', default: this.fb.array([]), reemplace: true },
      { field: 'base_product' },
      { field: 'product_by_custom_user_data_name' },
      { field: 'web_product_data_slug', default: false, reemplace: true },
      { field: 'web_product_data_description', default: false, reemplace: true },
    ];

    this.includeFieldsForm[this.typeDefault] = [
      { field: 'search_code', default: '' },
      { field: 'search_name', default: '' },
      { field: 'base_product_is_accepted', default: false, disabled: true },
      { field: 'price_product_price', default: null }, //para lista de precios
      { field: 'price_product_discount_type', default: null }, //para lista de precios
      { field: 'price_product_discount', default: null }, //para lista de precios
      { field: 'price_product_currency', default: null }, //para lista de precios
      { field: 'sales_taxes', default: null }, //para lista de precios
    ];

    //debo deprecarlo, elamente no tiene sentido tenerlo ya que es similar a additionalFieldsIncluded
    //ademas el principio donde agrego als erializado base_product_data ya no no creop ocuparlo porque existe cols.fiels
    //    "cols": {
    //    "hide": True,
    //    "label": "",
    //    "sortable": True,
    //    "locked": False,
    //    "fields":  {
    //        #0:{"field":"name"}
    //    }
    //}
    this.additionalFieldsAppCols[this.typeDefault as keyof typeof this.additionalFieldsAppCols] = {
      'base_product_data': { 'column_header_prefix': '', 'form_prefix': '', 'default_field': 'name' },
    };

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
