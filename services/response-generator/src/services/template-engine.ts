class TemplateEngine {
    /**
     * Render a template with given data
     * @param template Template string with placeholders
     * @param data Data to use for rendering
     * @returns Rendered template
     */
    render(template: string, data: any): string {
      try {
        // Replace placeholders with data
        let result = template;
        
        // Simple string replacements
        result = this.replaceSimplePlaceholders(result, data);
        
        // Process conditionals
        result = this.processConditionals(result, data);
        
        // Process loops
        result = this.processLoops(result, data);
        
        // Clean up any remaining placeholders or syntax
        result = this.cleanupTemplate(result);
        
        return result;
      } catch (error) {
        console.error('[RESPONSE] Error rendering template:', error);
        throw error;
      }
    }
    
    /**
     * Replace simple placeholders with values
     * @param template Template string
     * @param data Data object
     * @returns Template with placeholders replaced
     */
    private replaceSimplePlaceholders(template: string, data: any): string {
      // Replace {{key}} with data.key
      return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        // Trim the key
        const trimmedKey = key.trim();
        
        // Handle nested properties (e.g., {{user.name}})
        const value = this.getNestedValue(data, trimmedKey);
        
        // Return the value or empty string if not found
        return value !== undefined ? String(value) : '';
      });
    }
    
    /**
     * Process conditional blocks in template
     * @param template Template string
     * @param data Data object
     * @returns Template with conditionals processed
     */
    private processConditionals(template: string, data: any): string {
      // Process {{#if condition}}...{{/if}} blocks
      let result = template;
      const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)(?:\{\{#else\}\}([\s\S]*?))?\{\{\/if\}\}/g;
      
      return result.replace(ifRegex, (match, condition, ifContent, elseContent = '') => {
        // Evaluate the condition
        const conditionValue = this.evaluateCondition(condition, data);
        
        // Return the appropriate content
        return conditionValue ? ifContent : elseContent;
      });
    }
    
    /**
     * Process loop blocks in template
     * @param template Template string
     * @param data Data object
     * @returns Template with loops processed
     */
    private processLoops(template: string, data: any): string {
      // Process {{#each items}}...{{/each}} blocks
      let result = template;
      const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
      
      return result.replace(eachRegex, (match, itemsKey, content) => {
        // Get the array to iterate over
        const items = this.getNestedValue(data, itemsKey.trim());
        
        // If items is not an array or is empty, return empty string
        if (!Array.isArray(items) || items.length === 0) {
          return '';
        }
        
        // Process each item
        const processed = items.map((item, index) => {
          // Create a context for the item
          const itemData = {
            ...data,
            item,
            index
          };
          
          // Replace item-specific placeholders
          return this.replaceSimplePlaceholders(content, itemData);
        });
        
        // Join the processed items
        return processed.join('');
      });
    }
    
    /**
     * Clean up any remaining template syntax
     * @param template Template with potential leftover syntax
     * @returns Cleaned template
     */
    private cleanupTemplate(template: string): string {
      // Remove any remaining template tags
      return template
        .replace(/\{\{[^}]*\}\}/g, '') // Remove any remaining {{...}}
        .replace(/\s+/g, ' ') // Collapse whitespace
        .replace(/\s\./g, '.') // Fix spacing before periods
        .replace(/\s,/g, ',') // Fix spacing before commas
        .trim(); // Trim whitespace
    }
    
    /**
     * Get a nested value from an object
     * @param obj The object to extract from
     * @param path Path to the value (e.g., "user.name")
     * @returns The value or undefined if not found
     */
    private getNestedValue(obj: any, path: string): any {
      // Handle array access with dot notation (e.g., "knowledge.0.content")
      const parts = path.split('.');
      let current = obj;
      
      for (const part of parts) {
        if (current === null || current === undefined) {
          return undefined;
        }
        
        // Check if the part is an array index
        if (/^\d+$/.test(part)) {
          const index = parseInt(part, 10);
          if (Array.isArray(current) && index >= 0 && index < current.length) {
            current = current[index];
          } else {
            return undefined;
          }
        } else {
          current = current[part];
        }
      }
      
      return current;
    }
    
    /**
     * Evaluate a condition in a template
     * @param condition Condition to evaluate
     * @param data Data object
     * @returns Boolean result of the condition
     */
    private evaluateCondition(condition: string, data: any): boolean {
      // Handle basic conditions
      const trimmedCondition = condition.trim();
      
      // Check for existence (e.g., {{#if user}})
      if (!trimmedCondition.includes(' ')) {
        const value = this.getNestedValue(data, trimmedCondition);
        return !!value;
      }
      
      // Handle comparisons (e.g., {{#if knowledge.length > 0}})
      if (trimmedCondition.includes(' > ')) {
        const [leftPart, rightPart] = trimmedCondition.split(' > ').map(p => p.trim());
        const leftValue = this.getNestedValue(data, leftPart);
        const rightValue = !isNaN(parseFloat(rightPart)) ? parseFloat(rightPart) : this.getNestedValue(data, rightPart);
        return leftValue > rightValue;
      }
      
      if (trimmedCondition.includes(' < ')) {
        const [leftPart, rightPart] = trimmedCondition.split(' < ').map(p => p.trim());
        const leftValue = this.getNestedValue(data, leftPart);
        const rightValue = !isNaN(parseFloat(rightPart)) ? parseFloat(rightPart) : this.getNestedValue(data, rightPart);
        return leftValue < rightValue;
      }
      
      if (trimmedCondition.includes(' === ')) {
        const [leftPart, rightPart] = trimmedCondition.split(' === ').map(p => p.trim());
        const leftValue = this.getNestedValue(data, leftPart);
        const rightValue = rightPart === 'true' ? true : 
                            rightPart === 'false' ? false : 
                            !isNaN(parseFloat(rightPart)) ? parseFloat(rightPart) : 
                            this.getNestedValue(data, rightPart);
        return leftValue === rightValue;
      }
      
      if (trimmedCondition.includes(' == ')) {
        const [leftPart, rightPart] = trimmedCondition.split(' == ').map(p => p.trim());
        const leftValue = this.getNestedValue(data, leftPart);
        const rightValue = rightPart === 'true' ? true : 
                            rightPart === 'false' ? false : 
                            !isNaN(parseFloat(rightPart)) ? parseFloat(rightPart) : 
                            this.getNestedValue(data, rightPart);
        // eslint-disable-next-line eqeqeq
        return leftValue == rightValue;
      }
      
      if (trimmedCondition.includes(' != ')) {
        const [leftPart, rightPart] = trimmedCondition.split(' != ').map(p => p.trim());
        const leftValue = this.getNestedValue(data, leftPart);
        const rightValue = rightPart === 'true' ? true : 
                            rightPart === 'false' ? false : 
                            !isNaN(parseFloat(rightPart)) ? parseFloat(rightPart) : 
                            this.getNestedValue(data, rightPart);
        // eslint-disable-next-line eqeqeq
        return leftValue != rightValue;
      }
      
      if (trimmedCondition.includes(' !== ')) {
        const [leftPart, rightPart] = trimmedCondition.split(' !== ').map(p => p.trim());
        const leftValue = this.getNestedValue(data, leftPart);
        const rightValue = rightPart === 'true' ? true : 
                            rightPart === 'false' ? false : 
                            !isNaN(parseFloat(rightPart)) ? parseFloat(rightPart) : 
                            this.getNestedValue(data, rightPart);
        return leftValue !== rightValue;
      }
      
      // Fallback for unhandled conditions
      try {
        // Very simple evaluation - only use this for testing
        // In a real system, use a proper safe evaluation mechanism
        const evalContext = { ...data };
        const keys = Object.keys(evalContext);
        const values = Object.values(evalContext);
        // eslint-disable-next-line no-new-func
        const evalFn = new Function(...keys, `return ${trimmedCondition};`);
        return !!evalFn(...values);
      } catch (e) {
        console.error(`[RESPONSE] Error evaluating condition "${trimmedCondition}":`, e);
        return false;
      }
    }
  }
  
  export default new TemplateEngine();