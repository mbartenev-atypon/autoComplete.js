import inputComponent from "./components/Input";
import { generateList, closeAllLists } from "./controllers/listController";
import { navigate } from "./controllers/navigationController";
import {
  getInputValue,
  prepareQueryValue,
  checkTriggerCondition,
  listMatchingResults,
} from "./controllers/dataController";
import debouncer from "./utils/debouncer";
import eventEmitter from "./utils/eventEmitter";

/**
 * @desc This is autoComplete
 * @version 8.0.0
 * @example let autoCompleteJS = new autoComplete({config});
 */
export default class autoComplete {
  constructor(config) {
    // Deconstructing config values
    const {
      name = "Search",
      selector = "#autoComplete", // User input selector
      data: {
        src, // Data src selection
        key, // Data src key selection
        cache = false, // Flag to cache data src
        store, // Data feedback store
      },
      query, // Query interceptor function
      trigger: {
        event = ["input"], // autoComplete event
        condition = false, // condition trigger
      } = {},
      searchEngine = "strict", // Search engine type
      diacritics = false, // Diacritics to be ignored
      threshold = 1, // Minimum characters length before engine starts rendering
      debounce = 0, // Minimum duration for API calls debounce
      resultsList: {
        render = true,
        container = false,
        destination, // Results list selector
        position = "afterend", // Results list position
        element: resultsListElement = "ul", // Results list element tag
        idName: resultsListId = "autoComplete_list",
        className: resultsListClass = "autoComplete_list",
        navigation = false, // Results list navigation
      } = {},
      sort = false, // Sorting results list
      placeHolder, // Placeholder text
      maxResults = 5, // Maximum number of results to show
      resultItem: {
        content = false, // Result item function
        element: resultItemElement = "li", // Result item element tag
        idName: resultItemId = "autoComplete_result",
        className: resultItemClass = "autoComplete_result",
      } = {},
      noResults, // No results action
      highlight = false, // Highlighting matching results
      feedback, // Data feedback
      onSelection, // Action function on result selection
    } = config;

    // Assigning config values to properties
    this.name = name;
    this.selector = selector;
    this.data = {
      src,
      key,
      cache,
      store,
    };
    this.query = query;
    this.trigger = {
      event,
      condition,
    };
    this.searchEngine = searchEngine;
    this.diacritics = diacritics;
    this.threshold = threshold;
    this.debounce = debounce;
    this.resultsList = {
      render,
      container,
      destination: destination || this.inputField,
      position,
      element: resultsListElement,
      idName: resultsListId,
      className: resultsListClass,
      navigation,
    };
    this.sort = sort;
    this.placeHolder = placeHolder;
    this.maxResults = maxResults;
    this.resultItem = {
      content,
      element: resultItemElement,
      idName: resultItemId,
      className: resultItemClass,
    };
    this.noResults = noResults;
    this.highlight = highlight;
    this.feedback = feedback;
    this.onSelection = onSelection;
    // Invoking preInit automatically
    // when autoComplete instance gets initiated
    this.closeAllList = () => closeAllLists(this) // exposing api
    this.preInit();
    document.addEventListener("click", (event) => closeAllLists(this, event.target));
  }

  // Run autoComplete processes
  start(input, query) {
    // - Match query with existing value
    const results = listMatchingResults(this, query);
    // - Prepare data feedback object
    const dataFeedback = { input, query, matches: results, results: results.slice(0, this.maxResults) };
    /**
     * @emits {response} Emits Event on search response
     **/
    eventEmitter(this.inputField, dataFeedback, "autoComplete.results");
    // - Checks if there are NO results
    // Runs noResults action function
    if (!results.length) return this.noResults ? this.noResults(dataFeedback, generateList) : null;
    // - If resultsList set not to render
    if (!this.resultsList.render) return this.feedback(dataFeedback);
    // - Generate & Render results list
    if (results.length) {
      generateList(this, dataFeedback, results)
    }
    /**
     * @emits {rendered} Emits Event after results list rendering
     **/
    eventEmitter(this.inputField, dataFeedback, "autoComplete.rendered");
    // - Initialize navigation
    navigate(this, dataFeedback);
    /**
     * @desc
     * Listens for all `click` events in the document
     * and closes this menu if clicked outside the list and input field
     * @listens {click} Listens to all `click` events on the document
     **/
  }

  async dataStore() {
    // Check if cache is NOT true
    // and store is empty
    if (this.data.cache && this.data.store) return null;
    // Fetch new data from source and store it
    this.data.store = typeof this.data.src === "function" ? await this.data.src() : this.data.src;
    /**
     * @emits {request} Emits Event on data response
     **/
    eventEmitter(this.inputField, this.data.store, "autoComplete.fetch");
  }

  // Run autoComplete composer
  async compose() {
    // 0- Prepare raw input value
    const input = getInputValue(this.inputField);
    // 1- Prepare manipulated query input value
    const query = prepareQueryValue(input, this.query);
    // 2- Get trigger condition
    const triggerCondition = checkTriggerCondition(this, query);
    // 3- Check triggering condition
    if (triggerCondition) {
      // 4- Prepare the data
      await this.dataStore();
      // 5- Close all open lists
      closeAllLists(this);
      // 6- Start autoComplete engine
      this.start(input, query);
    } else {
      // 4- Close all open lists
      closeAllLists(this);
    }
  }

  // Initialization stage
  init(inputField) {
    this.inputField = inputField
    // Assign the input field selector
    // Set input field attributes
    inputComponent(this);
    // Set placeholder attribute value
    if (this.placeHolder) inputField.setAttribute("placeholder", this.placeHolder);
    // Run executer
    this.hook = debouncer(() => {
      // - Prepare autoComplete processes
      this.compose();
    }, this.debounce);
    /**
     * @listens {input} Listens to all `input` events on the input field
     **/
    this.trigger.event.forEach((eventType) => {
      inputField.addEventListener(eventType, this.hook);
    });
    /**
     * @emits {init} Emits Event on Initialization
     **/
    eventEmitter(inputField, null, "init");
  }

  // Pre-Initialization stage
  preInit() {
    const targetNode = document;
    const inputField = typeof this.selector === 'function' ? this.selector() : targetNode.querySelector(this.selector);
    // Options for the observer (which mutations to observe)
    eventEmitter(inputField, null, "connect");
    this.init(inputField);
  }

  // Un-initialize autoComplete
  unInit() {
    this.inputField.removeEventListener("input", this.hook);
    /**
     * @emits {detached} Emits Event on input eventListener detachment
     **/
    eventEmitter(this.inputField, null, "autoComplete.unInit");
  }
}
