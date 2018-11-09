// Dependencies
import * as React from "react";
import {
  List,
  InfiniteLoader,
  CellMeasurer,
  CellMeasurerCache
} from "react-virtualized";
import "react-virtualized/styles.css";
import './TableView.scss';

const FETCH_SIZE = 30;

type TableViewRowRenderer = (result: any) => any;
type TableViewDataResult = { 
  data: Array<any>,
  reachedEnd: boolean,

}
type TableViewDataFetchFn = (cursorStart: number, cursorEnd: number) => Promise<TableViewDataResult>;
type TableViewOnClick = (result: any) => void;

type TableViewProps = {
  fetch: TableViewDataFetchFn,
  fetchId: string,
  rowRenderer: TableViewRowRenderer,
  onClick?: TableViewOnClick,
  style?: any,
};

type TableViewState = {
  fetchId: string,
  isLoading: boolean,
  results: Array<any>,
  clear: boolean,
  height: number,
  width: number,
  hasMore: boolean,
};

class TableView extends React.Component<TableViewProps, TableViewState> {
  cursor: number;
  _cache: CellMeasurerCache;
  
  constructor(props: TableViewProps) {
    super(props);
    this.cursor = 0;
    this.state = {
      isLoading: true,
      results: [],
      clear: false,
      hasMore: false,
      height: 0,
      width: 0,
      fetchId: null,
    };
    this._cache = new CellMeasurerCache({
      fixedWidth: true,
    });
  }

  static getDerivedStateFromProps(props : TableViewProps, state : TableViewState) : TableViewState {
    if (props.fetchId !== state.fetchId) {
      state.fetchId = props.fetchId;
      state.clear = true;
    }
    return state;
  }

  fetch = () => {
    // set loading states
    this.setState({
      isLoading: true
    });

    const cursor = this.cursor;
    this.props.fetch(cursor, cursor + FETCH_SIZE).then((results: any) => {
      const newResults = this.state.results.concat(results.data);
      this.cursor += results.data.length;
      this.setState({
        results: newResults,
        hasMore: !results.reachedEnd && !results.reached_end,
        isLoading: false
      });
    });
  }

  rowRenderer = ({ index, key, parent, style } : any) => {
    if (index === this.state.results.length && this.state.hasMore) {
      return (
        <div key={key} style={style}>
          Loading...
        </div>
      );
    } else if (index === this.state.results.length) {
      return (
        <div key={key} style={
          {
            ...style,
          }}>
          {" "}
          End of results{" "}
        </div>
      );
    }

    const result = this.state.results[index];
    return (
      <CellMeasurer
        cache={this._cache}
        columnIndex={0}
        key={key}
        rowIndex={index}
        parent={parent}
      >
        <div
          className="table-item"
          onClick={() => this.props.onClick(result)}
          key={result.id}
          style={style}
        >
          {this.props.rowRenderer(result)}
        </div>
      </CellMeasurer>
    );
  };

  render() {
    // clear the results if needed
    if (this.state.clear) {
      this.cursor = 0;
      this._cache.clearAll();
      this.setState({
        results: [],
        clear: false,
      });
      this.fetch();
    }

    if (this.state.isLoading && this.state.results.length === 0) {
      return (
        <div id="table-view" className="table-view">
          Loading...
        </div>
      );
    } else if (this.state.results.length === 0) {
      const style = {
        height: this.state.height + "px"
      };
      return (
        <div id="table-view" className="table-view">
          <div style={style} className="table-view-list">
            <div className="table-view-empty">
              <h3>No results found.</h3>
            </div>
          </div>
        </div>
      );
    }

    const loadMoreRows : any = this.state.isLoading || !this.state.hasMore ? () : any => { return null; } : () : any => this.fetch();

    const isRowLoaded = ({ index }: any) => index < this.state.results.length;

    const rowCount = this.state.results.length + (this.state.hasMore ? 1 : 0);
    
    const width: number = document.getElementById("table-view").clientWidth;
    const height: number = document.getElementById("table-view").clientHeight;

    return (
      <div id="table-view" className="table-view">
        <InfiniteLoader
          isRowLoaded={isRowLoaded}
          loadMoreRows={loadMoreRows}
          rowCount={rowCount}
        >
          {({ onRowsRendered, registerChild, getRowHeight } : any) => (
            <List
              className="table-view-list"
              ref={registerChild}
              width={width}
              height={height}
              rowCount={rowCount}
              rowHeight={this._cache.rowHeight}
              deferredMeasurementCache={this._cache}
              onRowsRendered={onRowsRendered}
              rowRenderer={this.rowRenderer}
            />
          )}
        </InfiniteLoader>
      </div>
    );
  }
}

export { TableViewDataFetchFn, TableViewDataResult, TableViewRowRenderer }
export default TableView;