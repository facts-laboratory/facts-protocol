import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { UserSettingsService } from '../core/user-settings.service';
import { switchMap, map } from 'rxjs/operators';
import { ArweaveService } from '../core/arweave.service';
import { Observable, Subscription, of } from 'rxjs';
import { ArwikiQuery } from '../core/arwiki-query';
import { ArwikiCategoriesContract } from '../arwiki-contracts/arwiki-categories';
import { ArwikiSettingsContract } from '../arwiki-contracts/arwiki-settings';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-main-menu',
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.scss']
})
export class MainMenuComponent implements OnInit, OnDestroy {
	@Input() opened!: boolean;
	@Output() openedChange = new EventEmitter();
  routerLang: string = '';
  menuSubscription: Subscription = Subscription.EMPTY;
  loading: boolean = false;
  menu: any = {};
  categories: any;
  category_slugs: any;
  pages: any;
  defaultTheme: string = '';
  arwikiQuery: ArwikiQuery|null = null;

  constructor(
      private _userSettings: UserSettingsService,
      private _arweave: ArweaveService,
      private _categoriesContract: ArwikiCategoriesContract,
      private _settingsContract: ArwikiSettingsContract,
      private _snackBar: MatSnackBar
    ) { }

  async ngOnInit() {
    this.loading = true;
    this.arwikiQuery = new ArwikiQuery(this._arweave.arweave);

    this.getDefaultTheme();

    this._userSettings.routeLangStream.subscribe((data) => {
      this.routerLang = data;
    });

    let networkInfo;
    let maxHeight = 0;
    try {
      networkInfo = await this._arweave.arweave.network.getInfo();
      maxHeight = networkInfo.height;
    } catch (error) {
      this.message(error, 'error');
    }
    this.menuSubscription = this.arwikiQuery.getMainMenu(
      this._categoriesContract,
      this._settingsContract,
      maxHeight
    ).subscribe({
      next: (data) => {
        this.loading = false;
        this.category_slugs = Object.keys(data.categories);
        this.pages = data.pages;
        this.categories = data.categories;
        this.menu = {};

        for (let cats of this.category_slugs) {
          this.menu[cats] = [];
          if (this.pages && this.pages[cats]) {
            const pages_slugs = Object.keys(this.pages[cats]);
            for (let page_s of pages_slugs) {
              this.menu[cats].push(this.pages[cats][page_s]);
            }
          }
        }
        
      },
      error: (error) => {
        this.loading = false;
        alert('er' + error);
      }
    })
  }

  ngOnDestroy() {
    if (this.menuSubscription) {
      this.menuSubscription.unsubscribe();
    }
  }

  getDefaultTheme() {
    this.defaultTheme = this._userSettings.getDefaultTheme();
    this._userSettings.defaultThemeStream.subscribe(
      (theme) => {
        this.defaultTheme = theme;
      }
    );
  }

  toggleSideMenu() {
    this.opened = !this.opened;
    this.openedChange.emit(this.opened);
  }

  searchKeyNameInTags(_arr: any[], _key: string) {
    let res = '';
    for (const a of _arr) {
      if (a.name.toUpperCase() === _key.toUpperCase()) {
        return a.value;
      }
    }
    return res;
  }


  getSkeletonLoaderAnimationType() {
    let type = 'progress';
    if (this.defaultTheme === 'arwiki-dark') {
      type = 'progress-dark';
    }
    return type;
  }

  getSkeletonLoaderThemeNgStyle() {
    let ngStyle: any = {
      'height.px': '32',
      'width': '84%',
      'margin-top': '10px',
      'margin-left': '20px'
    };
    if (this.defaultTheme === 'arwiki-dark') {
      ngStyle['background-color'] = '#3d3d3d';
    }

    return ngStyle;
  }


  /*
  *  Custom snackbar message
  */
  message(msg: string, panelClass: string = '', verticalPosition: any = undefined) {
    this._snackBar.open(msg, 'X', {
      duration: 8000,
      horizontalPosition: 'center',
      verticalPosition: verticalPosition,
      panelClass: panelClass
    });
  }


}
