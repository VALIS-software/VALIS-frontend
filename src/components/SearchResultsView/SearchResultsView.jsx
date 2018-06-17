// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import DataListItem from "../DataListItem/DataListItem.jsx";
import EntityDetails from "../EntityDetails/EntityDetails";
import ZoomToButton from "../ZoomToButton/ZoomToButton.jsx";
import CircularProgress from "material-ui/CircularProgress";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails.jsx";

// Styles
import "./SearchResultsView.scss";

class SearchResultsView extends React.Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.viewModel = props.viewModel;
    this.api = this.appModel.api;
    this.state = {
      query: null,
      needsRefresh: true,
      results: []
    };
  }

  resultSelected(result) {
    this.viewModel.displayEntityDetails(result);
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) {
      prevState = {};
    }
    prevState.needsRefresh = prevState.query !== nextProps.query;
    prevState.query = nextProps.query;
    prevState.appModel = nextProps.appModel;
    return prevState;
  }

  render() {
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    if (this.state.needsRefresh) {
      this.api.getQueryResults(this.state.query).then(results => {
        if (results.results_total === 1) {
          this.viewModel.popView();
          this.resultSelected(results.data[0]);
        } else {
          this.setState({
            results: results.data,
            needsRefresh: false,
          });
        }
      }, (err) => {
        this.appModel.error(this, err);
        this.setState({
          error: err,
        });
      });
      return (
        <div className="navigation-controller-loading">
          <CircularProgress size={80} thickness={5} />{" "}
        </div>
      );
    }
    const searchResultItems = this.state.results.map(result => {
      let title = "";
      let description = "";
      const sourceStr = result.source.join("/");
      if (result.type === "trait") {
        title = result.name;
        description = "Source: " + sourceStr;
      } else {
        title = result.type + " " + result.name;
        description = result.info.description
          ? result.info.description
          : "Source: " + sourceStr;
      }

      return (
        <DataListItem
          title={title}
          description={description}
          onClick={() => this.resultSelected(result)}
          key={result.id}
        />
      );
    });
    return (
      <div className="search-results-view">
        <div className="result-info">
          {" "}
          {searchResultItems.length} results for query <i>{this.props.text} </i>
        </div>
        {searchResultItems}
      </div>
    );
  }
}

SearchResultsView.propTypes = {
  appModel: PropTypes.object,
  viewModel: PropTypes.object,
  query: PropTypes.object,
  text: PropTypes.string
};

export default SearchResultsView;