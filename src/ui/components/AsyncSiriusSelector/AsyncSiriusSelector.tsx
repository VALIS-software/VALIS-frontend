import * as React from 'react';
import AsyncSelect from 'react-select/lib/Async';
import { SiriusApi } from 'valis';
import FormControl from '@material-ui/core/FormControl';

const DEBOUNCE_TIME = 200;

type Props = {
  placeholder?: string,
  rule: string,
  onChange?: Function,
}


class AsyncSiriusSelector extends React.Component<Props> {
  public static readonly GENE = 'GENE';
  public static readonly CELL_TYPE = 'CELL_TYPE';
  public static readonly TUMOR_SITE = 'TUMOR_SITE';
  public static readonly TARGET = 'TARGET';
  public static readonly TRAIT = 'TRAIT';

  timeOfLastRequest: any;
  lastRequest: Promise<any>;


  constructor(props: Props) {
    super(props);
  }

  getThrottledResultPromise = (searchText: string) : Promise<any> => {
    const currTime = Date.now();
    this.timeOfLastRequest = currTime;
    this.lastRequest = new Promise((resolve, reject) => {
      setTimeout(() => {
        if (currTime < this.timeOfLastRequest) resolve(this.lastRequest);
        else {
          resolve(SiriusApi.getSuggestions(this.props.rule, searchText, 15).then(results => {
            return results.map((value : string) => { return { label: value, value: value}; });
          }));
        }
      }, DEBOUNCE_TIME);
    });
    return this.lastRequest;
  }

  render() {
    return (<div>
      <FormControl style={{marginTop: 12, minWidth: 300, marginLeft: 8}}>
      <AsyncSelect
          isMulti
          cacheOptions
          defaultOptions
          placeholder={this.props.placeholder}
          loadOptions={this.getThrottledResultPromise}
          onChange={(data: any) => this.props.onChange(data)}
      />
      </FormControl>
  </div>);
  }
}

export default AsyncSiriusSelector;