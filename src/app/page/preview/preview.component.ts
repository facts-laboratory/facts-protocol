import { Component, OnInit, OnDestroy } from '@angular/core';
import * as marked from 'marked';
import DOMPurify from 'dompurify';
import { Observable, Subscription, from } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { 
	readContract
} from 'smartweave';
import { ArweaveService } from '../../core/arweave.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Location } from '@angular/common';
import { ArwikiQuery } from '../../core/arwiki-query';
import ArdbBlock from 'ardb/lib/models/block';
import ArdbTransaction from 'ardb/lib/models/transaction';
import Prism from 'prismjs';

@Component({
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss']
})
export class PreviewComponent implements OnInit, OnDestroy {
	htmlContent: string = '';
	pageSubscription: Subscription = Subscription.EMPTY;
  page: any;
  loadingPage: boolean = false;
  arwikiQuery: ArwikiQuery|null = null;
  baseURL: string = this._arweave.baseURL;
  pageDataSubscription: Subscription = Subscription.EMPTY;

  constructor(
    private route: ActivatedRoute,
  	private _arweave: ArweaveService,
  	private _snackBar: MatSnackBar,
    private _location: Location
  ) { }

  ngOnInit(): void {
    Prism.manual = true;
  	const contractAddress = this.route.snapshot.paramMap.get('id')!;
    this.arwikiQuery = new ArwikiQuery(this._arweave.arweave);
    this.loadPageTXData(contractAddress);

    this.route.paramMap.subscribe(params => {
      const pageId = params.get('id');
      
      if (pageId) {
        this.loadPageTXData(contractAddress);
      }

    });
  	
  }

  ngOnDestroy() {
    this.pageSubscription.unsubscribe();
    this.pageDataSubscription.unsubscribe();
  }

  loadPageTXData(contractAddress: string) {
    this.loadingPage = true;
    this.pageSubscription = this.arwikiQuery!.getTXsData([contractAddress]).subscribe({
      next: (txData: ArdbTransaction[]|ArdbBlock[]) => {
        if (txData && txData.length) {
          const p = txData[0];
          const pTX: ArdbTransaction = new ArdbTransaction(p, this._arweave.arweave);
          this.page = {
            id: pTX.id,
            title: this.searchKeyNameInTags(pTX.tags, 'Arwiki-Page-Title'),
            slug: this.searchKeyNameInTags(pTX.tags, 'Arwiki-Page-Slug'),
            category: this.searchKeyNameInTags(pTX.tags, 'Arwiki-Page-Category'),
            language: this.searchKeyNameInTags(pTX.tags, 'Arwiki-Page-Lang'),
            img: this.searchKeyNameInTags(pTX.tags, 'Arwiki-Page-Img'),
            owner: pTX.owner.address,
            block: pTX.block
          };
          // Load content
          this.pageDataSubscription = this.loadPageData(contractAddress).pipe(
            catchError((error) => {
              console.error(error);
              this.message('TX not minted? Fetching data from gw ...', 'warning');
              const url = `${this._arweave.baseURL}${this.page.id}`;
              return from(fetch(url));
            })
          ).subscribe({
            next: async (data: string|Response) => {
              const res = typeof data === 'string' ? `${data}` : await data.text();
              this.htmlContent = this.markdownToHTML(res);
              this.loadingPage = false;
              
              Prism.highlightAll();

            }, error: (error) => {
              this.message(error, 'error');
              this.loadingPage = false;
            }
          });

        }
      },
      error: (error) => {
        this.message(error, 'error');
      }
    });
  }

  loadPageData(address: string) {
    return from(this._arweave.getDataAsString(address!));
  }

  markdownToHTML(_markdown: string) {
  	var html = marked(_markdown);
		var clean = DOMPurify.sanitize(html);
		return html;
  }


	/*
  *  Custom snackbar message
  */
  message(msg: string, panelClass: string = '', verticalPosition: any = undefined) {
    this._snackBar.open(msg, 'X', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: verticalPosition,
      panelClass: panelClass
    });
  }

  goBack() {
    this._location.back();
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
}
