#!/usr/bin/env python3
"""CLI tool for Strategy Copilot."""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api.services.ai_strategy_service import get_ai_strategy_service


def print_section(title: str):
    """Print a section header."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def cmd_modify(args):
    """Modify a strategy template."""
    print_section(f"Modifying Strategy: {args.template}")
    print(f"Requirements: {args.requirements}\n")
    
    service = get_ai_strategy_service()
    
    try:
        result = service.modify_strategy(
            template_name=args.template,
            requirements=args.requirements,
            temperature=args.temperature,
        )
        
        print(f"✓ Code generated (valid={result['is_valid']})")
        if result['errors']:
            print(f"⚠ Validation errors: {', '.join(result['errors'])}")
        
        if result['changes']:
            print(f"\nChanges made:")
            for i, change in enumerate(result['changes'], 1):
                print(f"  {i}. {change}")
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write(result['code'])
            print(f"\n✓ Saved to: {args.output}")
        else:
            print(f"\n{'='*60}")
            print("Generated Code:")
            print(f"{'='*60}\n")
            print(result['code'])
        
        # Print parameters schema
        if result['parameters_schema']:
            print(f"\n{'='*60}")
            print("Parameters:")
            print(f"{'='*60}")
            for name, info in result['parameters_schema'].items():
                default = info.get('default', 'N/A')
                print(f"  {name}: {default} ({info.get('type', 'unknown')})")
        
    except ValueError as e:
        print(f"✗ Error: {e}")
        return 1
    except Exception as e:
        print(f"✗ AI service error: {e}")
        return 1
    
    return 0


def cmd_optimize(args):
    """Optimize an existing strategy."""
    print_section(f"Optimizing Strategy from: {args.file}")
    print(f"Goal: {args.goal}\n")
    
    # Read strategy code
    try:
        with open(args.file, 'r') as f:
            code = f.read()
    except FileNotFoundError:
        print(f"✗ File not found: {args.file}")
        return 1
    
    service = get_ai_strategy_service()
    
    try:
        result = service.optimize_strategy(
            strategy_code=code,
            strategy_name=args.name or os.path.basename(args.file),
            optimization_goal=args.goal,
            temperature=args.temperature,
        )
        
        print(f"✓ Code optimized (valid={result['is_valid']})")
        if result['errors']:
            print(f"⚠ Validation errors: {', '.join(result['errors'])}")
        
        print(f"\n{'='*60}")
        print("Analysis:")
        print(f"{'='*60}")
        print(result['analysis'])
        
        if result['suggestions']:
            print(f"\n{'='*60}")
            print("Optimization Suggestions:")
            print(f"{'='*60}")
            for i, suggestion in enumerate(result['suggestions'], 1):
                print(f"  {i}. {suggestion}")
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write(result['code'])
            print(f"\n✓ Saved optimized code to: {args.output}")
        else:
            print(f"\n{'='*60}")
            print("Optimized Code:")
            print(f"{'='*60}\n")
            print(result['code'])
        
    except Exception as e:
        print(f"✗ AI service error: {e}")
        return 1
    
    return 0


def cmd_explain(args):
    """Explain a strategy."""
    print_section(f"Explaining Strategy: {args.file}")
    
    # Read strategy code
    try:
        with open(args.file, 'r') as f:
            code = f.read()
    except FileNotFoundError:
        print(f"✗ File not found: {args.file}")
        return 1
    
    service = get_ai_strategy_service()
    
    try:
        result = service.explain_strategy(
            strategy_code=code,
            strategy_name=args.name or os.path.basename(args.file),
            output_format="text",
        )
        
        print(result['explanation'])
        
    except Exception as e:
        print(f"✗ AI service error: {e}")
        return 1
    
    return 0


def cmd_list_templates(args):
    """List available templates."""
    print_section("Available Strategy Templates")
    
    service = get_ai_strategy_service()
    templates = service._get_templates()
    
    for name, template in templates.items():
        print(f"\n  {name}")
        print(f"    Type: {template.template_type}")
        print(f"    Description: {template.description}")
        print(f"    Tags: {', '.join(template.tags)}")


def main():
    parser = argparse.ArgumentParser(
        description="Strategy Copilot - AI-powered strategy modification and optimization"
    )
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Modify command
    modify_parser = subparsers.add_parser('modify', help='Modify a strategy template')
    modify_parser.add_argument('template', help='Template name (e.g., 双均线策略)')
    modify_parser.add_argument('requirements', help='Modification requirements')
    modify_parser.add_argument('-t', '--temperature', type=float, default=0.3,
                              help='LLM temperature (0.0-1.0)')
    modify_parser.add_argument('-o', '--output', help='Output file path')
    
    # Optimize command
    optimize_parser = subparsers.add_parser('optimize', help='Optimize a strategy')
    optimize_parser.add_argument('file', help='Strategy file path')
    optimize_parser.add_argument('goal', help='Optimization goal (e.g., 降低最大回撤)')
    optimize_parser.add_argument('-n', '--name', help='Strategy name')
    optimize_parser.add_argument('-t', '--temperature', type=float, default=0.3)
    optimize_parser.add_argument('-o', '--output', help='Output file path')
    
    # Explain command
    explain_parser = subparsers.add_parser('explain', help='Explain a strategy')
    explain_parser.add_argument('file', help='Strategy file path')
    explain_parser.add_argument('-n', '--name', help='Strategy name')
    
    # List templates command
    list_parser = subparsers.add_parser('list', help='List available templates')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    # Check environment variables
    if not os.environ.get('LLM_API_URL') or not os.environ.get('LLM_API_KEY'):
        print("Error: LLM_API_URL and LLM_API_KEY environment variables must be set")
        print("\nExample:")
        print("  export LLM_API_URL=https://api.moonshot.cn/v1")
        print("  export LLM_API_KEY=sk-your-key")
        print("  export LLM_MODEL=kimi-k2.5")
        return 1
    
    # Dispatch command
    commands = {
        'modify': cmd_modify,
        'optimize': cmd_optimize,
        'explain': cmd_explain,
        'list': cmd_list_templates,
    }
    
    return commands[args.command](args)


if __name__ == '__main__':
    sys.exit(main())
